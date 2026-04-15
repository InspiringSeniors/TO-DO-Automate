import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react'
import { getUserTasks, completeTask } from '../../services/api'

interface Task {
  id: string; task_name: string; description?: string
  due_datetime: string; priority: string; status: string; source: string
}
interface UserItem { id: string; full_name: string; email: string; username: string; role: string }

const priorityStyle: Record<string, string> = {
  high:   'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low:    'bg-emerald-500/20 text-emerald-400',
}
const statusStyle: Record<string, string> = {
  completed:   'bg-emerald-500/20 text-emerald-400',
  pending:     'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-indigo-500/20 text-indigo-400',
}

function urgencyLabel(due: string, status: string) {
  if (status === 'completed') return null
  const diff = new Date(due).getTime() - Date.now()
  const mins = diff / 60_000
  if (mins < 0)    return { text: 'Overdue',    cls: 'text-red-400' }
  if (mins < 30)   return { text: 'Due <30 min', cls: 'text-orange-400' }
  if (mins < 1440) return { text: 'Due today',   cls: 'text-amber-400' }
  return null
}

interface Props {
  user: UserItem
  onClose: () => void
}

export default function UserTasksPanel({ user, onClose }: Props) {
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'pending' | 'completed'>('all')
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data } = await getUserTasks(user.id)
      setTasks(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchTasks() }, [user.id])

  const handleComplete = async (id: string) => {
    setCompleting(id)
    try { await completeTask(id); fetchTasks() }
    finally { setCompleting(null) }
  }

  const filtered = tasks.filter(t =>
    filter === 'all' ? true : t.status === filter
  )

  const counts = {
    all:       tasks.length,
    pending:   tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800
                      shadow-2xl z-50 flex flex-col animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center
                            text-sm font-bold text-white shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{user.full_name}</h2>
              <p className="text-xs text-slate-400">{user.email} · @{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={18} />
          </button>
        </div>

        {/* Stats + filter tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-slate-800 shrink-0">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f === 'pending'   && <Clock size={12} />}
              {f === 'completed' && <CheckCircle2 size={12} />}
              {f === 'all'       && <ListTodo size={12} />}
              <span className="capitalize">{f}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-brand-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <CheckCircle2 size={36} className="text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No {filter === 'all' ? '' : filter} tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filtered.map(task => {
                const urg = urgencyLabel(task.due_datetime, task.status)
                const due = new Date(task.due_datetime)
                return (
                  <div key={task.id}
                       className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors group">

                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      task.status === 'completed' ? 'bg-emerald-500' :
                      urg?.text === 'Overdue'     ? 'bg-red-500' : 'bg-blue-500'
                    }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                          {task.task_name}
                        </p>
                        {urg && (
                          <span className={`flex items-center gap-1 text-[11px] font-semibold ${urg.cls}`}>
                            <AlertTriangle size={11} />
                            {urg.text}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${priorityStyle[task.priority] ?? priorityStyle.low}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusStyle[task.status] ?? statusStyle.pending}`}>
                          {task.status}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' '}
                          {due.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>

                    {/* Mark done — only for pending */}
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={completing === task.id}
                        title="Mark as done"
                        className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1.5
                                   px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40
                                   text-emerald-400 text-xs font-medium transition-all disabled:opacity-40"
                      >
                        {completing === task.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <CheckCircle2 size={12} />
                        }
                        Done
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {!loading && tasks.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-800 flex gap-6 shrink-0">
            <span className="text-xs text-slate-500">
              <span className="text-white font-semibold">{counts.pending}</span> pending
            </span>
            <span className="text-xs text-slate-500">
              <span className="text-emerald-400 font-semibold">{counts.completed}</span> completed
            </span>
            <span className="text-xs text-slate-500">
              <span className="text-white font-semibold">
                {tasks.length > 0 ? Math.round((counts.completed / tasks.length) * 100) : 0}%
              </span> completion rate
            </span>
          </div>
        )}
      </div>
    </>
  )
}
