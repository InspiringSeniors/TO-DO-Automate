import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2, Plus, Loader2, Target } from 'lucide-react'
import StrategySection from './StrategySection'
import Modal from '../common/Modal'
import { deleteGoal, createStrategy } from '../../services/api'

interface Activity {
  id: string; title: string; description?: string
  due_datetime: string; status: string; strategy_id: string
}
interface Strategy {
  id: string; goal_id: string; title: string; activities: Activity[]
}
interface Goal {
  id: string; user_id: string; title: string
  completion_pct: number; strategies: Strategy[]
}

interface Props {
  goal: Goal
  onRefresh: () => void
}

export default function GoalCard({ goal, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showAddStrategy, setShowAddStrategy] = useState(false)
  const [strategyTitle, setStrategyTitle] = useState('')
  const [savingStrategy, setSavingStrategy] = useState(false)
  const [deletingGoal, setDeletingGoal] = useState(false)

  const pct = goal.completion_pct

  const handleDeleteGoal = async () => {
    if (!confirm(`Delete goal "${goal.title}" and everything under it?`)) return
    setDeletingGoal(true)
    try {
      await deleteGoal(goal.id)
      onRefresh()
    } finally { setDeletingGoal(false) }
  }

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!strategyTitle.trim()) return
    setSavingStrategy(true)
    try {
      await createStrategy(goal.id, { title: strategyTitle.trim() })
      setStrategyTitle('')
      setShowAddStrategy(false)
      onRefresh()
    } finally { setSavingStrategy(false) }
  }

  return (
    <div className="card overflow-hidden">
      {/* Goal header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
          <Target size={18} className="text-brand-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white truncate">{goal.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 max-w-xs h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? 'rgb(52 211 153)'
                    : pct >= 50
                    ? 'rgb(99 102 241)'
                    : 'rgb(99 102 241 / 0.7)',
                }}
              />
            </div>
            <span className={`text-xs font-semibold tabular-nums ${pct === 100 ? 'text-emerald-400' : 'text-brand-400'}`}>
              {pct}%
            </span>
            <span className="text-xs text-slate-500">
              {goal.strategies.length} {goal.strategies.length === 1 ? 'strategy' : 'strategies'}
              {' · '}
              {goal.strategies.reduce((n, s) => n + s.activities.length, 0)} activities
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleDeleteGoal}
            disabled={deletingGoal}
            title="Delete goal"
            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
          >
            {deletingGoal ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-slate-800">
          <div className="pt-4 space-y-3">
            {goal.strategies.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">
                No strategies yet — add one to get started.
              </p>
            ) : (
              goal.strategies.map(s => (
                <StrategySection
                  key={s.id}
                  strategy={s}
                  goalId={goal.id}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </div>

          <button
            onClick={() => setShowAddStrategy(true)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-400
                       transition-colors py-1"
          >
            <Plus size={15} />
            Add Strategy
          </button>
        </div>
      )}

      {showAddStrategy && (
        <Modal title="Add Strategy" onClose={() => setShowAddStrategy(false)}>
          <form onSubmit={handleAddStrategy} className="space-y-4">
            <div>
              <label className="label">Strategy Name *</label>
              <input
                value={strategyTitle}
                onChange={e => setStrategyTitle(e.target.value)}
                required className="input"
                placeholder="e.g. Digital outreach campaign"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowAddStrategy(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={savingStrategy} className="btn-primary">
                {savingStrategy ? 'Adding...' : 'Add Strategy'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
