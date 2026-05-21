import { useState } from 'react'
import { Trash2, Plus, Loader2, ListTodo } from 'lucide-react'
import ActivityRow from './ActivityRow'
import ActivityModal from './ActivityModal'
import { deleteStrategy, createActivity } from '../../services/api'

interface Activity {
  id: string; title: string; description?: string
  due_datetime: string; status: string; strategy_id: string
}
interface Strategy {
  id: string; goal_id: string; title: string
  activities: Activity[]
}

interface Props {
  strategy: Strategy
  goalId: string
  onRefresh: () => void
}

export default function StrategySection({ strategy, goalId, onRefresh }: Props) {
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteStrategy = async () => {
    if (!confirm(`Delete strategy "${strategy.title}" and all its activities?`)) return
    setDeleting(true)
    try {
      await deleteStrategy(goalId, strategy.id)
      onRefresh()
    } finally { setDeleting(false) }
  }

  const handleAddActivity = async (data: object) => {
    await createActivity(goalId, strategy.id, data as { title: string; description?: string; due_datetime: string })
    onRefresh()
  }

  const completed = strategy.activities.filter(a => a.status === 'completed').length
  const total = strategy.activities.length

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/30">
      {/* Strategy header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-200">{strategy.title}</span>
          {total > 0 && (
            <span className="text-xs text-slate-500 ml-1">{completed}/{total}</span>
          )}
        </div>
        <button
          onClick={handleDeleteStrategy}
          disabled={deleting}
          title="Delete strategy"
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>

      {/* Activities */}
      {strategy.activities.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-slate-600">
          <ListTodo size={14} />
          <span className="text-xs">No activities yet</span>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {strategy.activities.map(a => (
            <ActivityRow
              key={a.id}
              activity={a}
              goalId={goalId}
              strategyId={strategy.id}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Add activity */}
      <div className="px-4 py-2 border-t border-slate-700/40">
        <button
          onClick={() => setShowAddActivity(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400
                     transition-colors py-1"
        >
          <Plus size={13} />
          Add Activity
        </button>
      </div>

      {showAddActivity && (
        <ActivityModal
          mode="add"
          onClose={() => setShowAddActivity(false)}
          onSubmit={handleAddActivity}
        />
      )}
    </div>
  )
}
