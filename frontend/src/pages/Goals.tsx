import { useEffect, useState, useCallback } from 'react'
import MainLayout from '../components/layout/MainLayout'
import GoalCard from '../components/goals/GoalCard'
import Modal from '../components/common/Modal'
import { getGoals, createGoal } from '../services/api'
import { Plus, Loader2, Target } from 'lucide-react'

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

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getGoals()
      setGoals(data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await createGoal({ title: newTitle.trim() })
      setNewTitle('')
      setShowAdd(false)
      fetchGoals()
    } catch {
      setError('Failed to create goal. Please try again.')
    } finally { setSaving(false) }
  }

  const totalActivities = goals.reduce((n, g) => n + g.strategies.reduce((m, s) => m + s.activities.length, 0), 0)
  const completedGoals = goals.filter(g => g.completion_pct === 100).length

  return (
    <MainLayout title="Goals">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Goals</h2>
            <p className="text-slate-400 text-sm">
              {goals.length} goal{goals.length !== 1 ? 's' : ''}
              {totalActivities > 0 && ` · ${totalActivities} activities`}
              {completedGoals > 0 && ` · ${completedGoals} completed`}
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> New Goal
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/10 flex items-center justify-center mb-4">
              <Target size={28} className="text-brand-500" />
            </div>
            <h3 className="text-white font-semibold mb-1">No goals yet</h3>
            <p className="text-slate-500 text-sm mb-5">
              Create a goal, add strategies under it, then break each strategy into trackable activities.
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Create your first goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(g => (
              <GoalCard key={g.id} goal={g} onRefresh={fetchGoals} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="New Goal" onClose={() => { setShowAdd(false); setNewTitle(''); setError('') }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Goal Name *</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required className="input"
                placeholder="e.g. Expand community outreach by Q3"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500">
              You'll add strategies and activities after creating the goal.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowAdd(false); setNewTitle(''); setError('') }}
                className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </MainLayout>
  )
}
