import { useEffect, useState } from 'react'
import { X, Loader2, Target, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { getGoals } from '../../services/api'

interface Activity {
  id: string; title: string; due_datetime: string; status: string
}
interface Strategy {
  id: string; title: string; activities: Activity[]
}
interface Goal {
  id: string; title: string; completion_pct: number; strategies: Strategy[]
}
interface UserItem { id: string; full_name: string; email: string; username: string }

interface Props {
  user: UserItem
  onClose: () => void
}

const statusStyle: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400',
  pending:   'bg-blue-500/20 text-blue-400',
  overdue:   'bg-red-500/20 text-red-400',
}

export default function UserGoalsPanel({ user, onClose }: Props) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoading(true)
    getGoals({ user_id: user.id })
      .then(({ data }) => {
        setGoals(data)
        const init: Record<string, boolean> = {}
        data.forEach((g: Goal) => { init[g.id] = true })
        setExpanded(init)
      })
      .finally(() => setLoading(false))
  }, [user.id])

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
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
              <p className="text-xs text-slate-400">{user.email} · Goals Overview</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>

        {/* Summary bar */}
        {!loading && goals.length > 0 && (
          <div className="flex gap-6 px-6 py-3 border-b border-slate-800 shrink-0">
            <span className="text-xs text-slate-500">
              <span className="text-white font-semibold">{goals.length}</span> goals
            </span>
            <span className="text-xs text-slate-500">
              <span className="text-white font-semibold">
                {goals.reduce((n, g) => n + g.strategies.length, 0)}
              </span> strategies
            </span>
            <span className="text-xs text-slate-500">
              <span className="text-emerald-400 font-semibold">
                {goals.filter(g => g.completion_pct === 100).length}
              </span> completed
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-brand-400" />
            </div>
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Target size={36} className="text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No goals yet</p>
            </div>
          ) : (
            goals.map(goal => (
              <div key={goal.id} className="card overflow-hidden">
                {/* Goal row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  onClick={() => toggle(goal.id)}
                >
                  <Target size={16} className="text-brand-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{goal.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${goal.completion_pct}%`,
                            background: goal.completion_pct === 100 ? 'rgb(52 211 153)' : 'rgb(99 102 241)',
                          }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${goal.completion_pct === 100 ? 'text-emerald-400' : 'text-brand-400'}`}>
                        {goal.completion_pct}%
                      </span>
                    </div>
                  </div>
                  {goal.completion_pct === 100 && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                  {expanded[goal.id] ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
                </div>

                {/* Strategies + activities */}
                {expanded[goal.id] && goal.strategies.length > 0 && (
                  <div className="border-t border-slate-800 divide-y divide-slate-800">
                    {goal.strategies.map(s => (
                      <div key={s.id} className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                          {s.title}
                        </p>
                        {s.activities.length === 0 ? (
                          <p className="text-xs text-slate-600 ml-3">No activities</p>
                        ) : (
                          <div className="space-y-1 ml-3">
                            {s.activities.map(a => (
                              <div key={a.id} className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusStyle[a.status] ?? statusStyle.pending}`}>
                                  {a.status}
                                </span>
                                <span className={`text-xs ${a.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                  {a.title}
                                </span>
                                <span className="text-[11px] text-slate-600 ml-auto shrink-0">
                                  {new Date(a.due_datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
