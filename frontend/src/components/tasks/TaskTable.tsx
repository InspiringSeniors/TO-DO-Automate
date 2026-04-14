import { Pencil, Trash2, CheckCircle2, Clock, FileSpreadsheet } from 'lucide-react'
import { deleteTask, completeTask } from '../../services/api'

interface Task {
  id: string; task_name: string; description?: string
  due_datetime: string; priority: string; status: string; source: string
}

const priorityBadge = (p: string) => ({ low: 'badge-low', medium: 'badge-medium', high: 'badge-high' }[p] || 'badge-low')
const statusBadge = (s: string) => s === 'completed' ? 'badge-completed' : 'badge-pending'

interface Props { tasks: Task[]; onRefresh: () => void; onEdit: (t: Task) => void }

export default function TaskTable({ tasks, onRefresh, onEdit }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-400 font-medium">No tasks found</p>
        <p className="text-slate-600 text-sm mt-1">Create a task or adjust your filters</p>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    await deleteTask(id); onRefresh()
  }
  const handleComplete = async (id: string) => {
    await completeTask(id); onRefresh()
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {['Task Name', 'Due Date', 'Priority', 'Status', 'Source', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {tasks.map((task) => {
              const due = new Date(task.due_datetime)
              const isOverdue = due < new Date() && task.status !== 'completed'
              return (
                <tr key={task.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-3">
                    <p className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                      {task.task_name}
                    </p>
                    {task.description && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className={`text-sm ${isOverdue ? 'text-red-400' : 'text-slate-300'}`}>
                      {due.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">{due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={priorityBadge(task.priority)}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(task.status)}>{task.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      {task.source === 'excel' && <FileSpreadsheet size={14} className="text-emerald-400" />}
                      <span className="capitalize">{task.source}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {task.status !== 'completed' && (
                        <button onClick={() => handleComplete(task.id)} title="Mark complete" className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors">
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button onClick={() => onEdit(task)} title="Edit" className="p-1.5 rounded-lg hover:bg-brand-500/20 text-slate-400 hover:text-brand-400 transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
