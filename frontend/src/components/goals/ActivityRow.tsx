import { useState } from 'react'
import { Pencil, Trash2, CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react'
import ActivityModal from './ActivityModal'
import { updateActivity, deleteActivity } from '../../services/api'

interface Activity {
  id: string; title: string; description?: string
  due_datetime: string; status: string; strategy_id: string
}

interface Props {
  activity: Activity
  goalId: string
  strategyId: string
  onRefresh: () => void
}

const statusStyle: Record<string, string> = {
  pending:   'bg-blue-500/20 text-blue-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  overdue:   'bg-red-500/20 text-red-400',
}

export default function ActivityRow({ activity, goalId, strategyId, onRefresh }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const due = new Date(activity.due_datetime)
  const isOverdue = activity.status === 'overdue'
  const isPending = activity.status === 'pending'

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await updateActivity(goalId, strategyId, activity.id, { status: 'completed' })
      onRefresh()
    } finally { setCompleting(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this activity?')) return
    setDeleting(true)
    try {
      await deleteActivity(goalId, strategyId, activity.id)
      onRefresh()
    } finally { setDeleting(false) }
  }

  const handleEdit = async (data: object) => {
    await updateActivity(goalId, strategyId, activity.id, data)
    onRefresh()
  }

  return (
    <>
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors group rounded-xl">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
          activity.status === 'completed' ? 'bg-emerald-500' :
          isOverdue ? 'bg-red-500' : 'bg-blue-400'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${activity.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
              {activity.title}
            </p>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusStyle[activity.status] ?? statusStyle.pending}`}>
              {isOverdue && <AlertTriangle size={10} className="inline mr-1" />}
              {activity.status}
            </span>
          </div>
          {activity.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={11} className="text-slate-600" />
            <span className={`text-[11px] ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
              {due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' '}
              {due.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {(isPending || isOverdue) && (
            <button
              onClick={handleComplete}
              disabled={completing}
              title="Mark as completed"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40
                         text-emerald-400 text-xs font-medium transition-all disabled:opacity-40"
            >
              {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            </button>
          )}
          <button onClick={() => setShowEdit(true)} title="Edit"
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={handleDelete} disabled={deleting} title="Delete"
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {showEdit && (
        <ActivityModal
          mode="edit"
          activity={activity}
          onClose={() => setShowEdit(false)}
          onSubmit={handleEdit}
        />
      )}
    </>
  )
}
