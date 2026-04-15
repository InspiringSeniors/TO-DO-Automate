import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap, CheckCircle2, AlertTriangle, Clock, CalendarClock } from 'lucide-react'
import { completeTask } from '../../services/api'

interface Task {
  id: string
  task_name: string
  description?: string
  due_datetime: string
  priority: string
  status: string
}

// ── Scoring ────────────────────────────────────────────────────────────────────
// Returns a score (higher = more critical) plus display metadata.
function scoreTask(task: Task, now: Date) {
  const due     = new Date(task.due_datetime)
  const diffMs  = due.getTime() - now.getTime()
  const diffMin = diffMs / 60_000

  // Priority weight (tiebreaker inside the same urgency band)
  const priorityScore = task.priority === 'high' ? 300 : task.priority === 'medium' ? 200 : 100

  // Urgency band
  let urgencyScore: number
  let label: string
  let labelBg: string
  let labelText: string
  let timeText: string
  let rowAccent: string   // left-border colour class
  let icon: 'overdue' | 'warning' | 'clock' | 'calendar'

  if (diffMin < 0) {
    // Overdue — the more overdue the higher the score
    urgencyScore = 10_000 + Math.abs(diffMin)
    label        = 'Overdue'
    labelBg      = 'bg-red-500/20'
    labelText    = 'text-red-400'
    rowAccent    = 'border-l-red-500'
    icon         = 'overdue'
    const absMins = Math.abs(diffMin)
    if (absMins < 60)       timeText = `${Math.round(absMins)}m overdue`
    else if (absMins < 1440) timeText = `${Math.round(absMins / 60)}h overdue`
    else                    timeText = `${Math.round(absMins / 1440)}d overdue`
  } else if (diffMin <= 30) {
    urgencyScore = 5_000 + priorityScore
    label        = 'Due in <30 min'
    labelBg      = 'bg-red-500/20'
    labelText    = 'text-red-400'
    rowAccent    = 'border-l-orange-500'
    icon         = 'warning'
    timeText     = `${Math.round(diffMin)}m left`
  } else if (diffMin <= 120) {
    urgencyScore = 4_000 + priorityScore
    label        = 'Due in <2 hours'
    labelBg      = 'bg-orange-500/20'
    labelText    = 'text-orange-400'
    rowAccent    = 'border-l-amber-500'
    icon         = 'warning'
    timeText     = `${Math.round(diffMin)}m left`
  } else if (diffMin <= 480) {
    urgencyScore = 3_000 + priorityScore
    label        = 'Due in <8 hours'
    labelBg      = 'bg-amber-500/20'
    labelText    = 'text-amber-400'
    rowAccent    = 'border-l-yellow-500'
    icon         = 'clock'
    timeText     = `${(diffMin / 60).toFixed(1)}h left`
  } else if (diffMin <= 1_440) {
    urgencyScore = 2_000 + priorityScore
    label        = 'Due today'
    labelBg      = 'bg-yellow-500/20'
    labelText    = 'text-yellow-400'
    rowAccent    = 'border-l-blue-400'
    icon         = 'clock'
    timeText     = `${Math.round(diffMin / 60)}h left`
  } else if (diffMin <= 4_320) {
    urgencyScore = 1_000 + priorityScore
    label        = 'Due in 2–3 days'
    labelBg      = 'bg-blue-500/20'
    labelText    = 'text-blue-400'
    rowAccent    = 'border-l-indigo-400'
    icon         = 'calendar'
    timeText     = `${Math.round(diffMin / 1_440)}d left`
  } else {
    urgencyScore = 100 + priorityScore
    label        = 'Upcoming'
    labelBg      = 'bg-slate-700/60'
    labelText    = 'text-slate-400'
    rowAccent    = 'border-l-slate-600'
    icon         = 'calendar'
    timeText     = `${Math.round(diffMin / 1_440)}d left`
  }

  return {
    score: urgencyScore,
    label, labelBg, labelText, rowAccent, icon, timeText,
  }
}

const priorityStyles: Record<string, string> = {
  high:   'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low:    'bg-emerald-500/20 text-emerald-400',
}

const UrgencyIcon = ({ type }: { type: string }) => {
  if (type === 'overdue') return <AlertTriangle size={13} className="text-red-400 shrink-0" />
  if (type === 'warning') return <AlertTriangle size={13} className="text-orange-400 shrink-0" />
  if (type === 'clock')   return <Clock         size={13} className="text-amber-400 shrink-0" />
  return                         <CalendarClock  size={13} className="text-blue-400 shrink-0" />
}

interface Props {
  tasks: Task[]
  onRefresh: () => void
}

export default function SmartPriorityPanel({ tasks, onRefresh }: Props) {
  const [open, setOpen]    = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const now = new Date()

  const pending = tasks.filter(t => t.status === 'pending')

  const ranked = pending
    .map(t => ({ task: t, meta: scoreTask(t, now) }))
    .sort((a, b) => b.meta.score - a.meta.score)
    .slice(0, 8)

  if (pending.length === 0) return null

  const handleComplete = async (id: string) => {
    setCompleting(id)
    try { await completeTask(id); onRefresh() }
    finally { setCompleting(null) }
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4
                   bg-gradient-to-r from-indigo-600/30 to-purple-600/20
                   hover:from-indigo-600/40 hover:to-purple-600/30 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center">
            <Zap size={15} className="text-indigo-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Smart Prioritization</p>
            <p className="text-xs text-slate-400">
              {pending.length} pending task{pending.length !== 1 ? 's' : ''} — ranked by urgency × priority
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp   size={16} className="text-slate-400 shrink-0" />
          : <ChevronDown size={16} className="text-slate-400 shrink-0" />
        }
      </button>

      {/* Body */}
      {open && (
        <div className="divide-y divide-slate-800/70">
          {ranked.map(({ task, meta }, idx) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 px-5 py-3.5 border-l-4 ${meta.rowAccent}
                          hover:bg-slate-800/40 transition-colors group`}
            >
              {/* Rank */}
              <span className="w-6 text-center text-xs font-bold text-slate-500 shrink-0">
                #{idx + 1}
              </span>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white truncate">{task.task_name}</p>
                  {/* Urgency badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.labelBg} ${meta.labelText}`}>
                    <UrgencyIcon type={meta.icon} />
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Priority */}
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${priorityStyles[task.priority] ?? priorityStyles.low}`}>
                    {task.priority}
                  </span>
                  {/* Time remaining */}
                  <span className="text-xs text-slate-500">{meta.timeText}</span>
                  {/* Due date */}
                  <span className="text-xs text-slate-600">
                    {new Date(task.due_datetime).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })}
                  </span>
                </div>
              </div>

              {/* Mark done */}
              <button
                onClick={() => handleComplete(task.id)}
                disabled={completing === task.id}
                title="Mark as done"
                className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1.5
                           px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40
                           text-emerald-400 text-xs font-medium transition-all disabled:opacity-40"
              >
                <CheckCircle2 size={13} />
                Done
              </button>
            </div>
          ))}

          {/* Footer legend */}
          <div className="px-5 py-2.5 flex gap-4 flex-wrap">
            {[
              { color: 'bg-red-500',    label: 'Overdue' },
              { color: 'bg-orange-500', label: '<30 min' },
              { color: 'bg-yellow-500', label: '<8 hours' },
              { color: 'bg-blue-400',   label: 'Today' },
              { color: 'bg-indigo-400', label: '2–3 days' },
              { color: 'bg-slate-600',  label: 'Upcoming' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
