import { useState } from 'react'
import Modal from '../common/Modal'
import { updateTask } from '../../services/api'

interface Task { id: string; task_name: string; description?: string; due_datetime: string; priority: string; status: string }
interface Props { task: Task; onClose: () => void; onUpdated: () => void }

export default function EditTaskModal({ task, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    task_name: task.task_name,
    description: task.description || '',
    due_datetime: task.due_datetime.slice(0, 16),
    priority: task.priority,
    status: task.status,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await updateTask(task.id, { ...form, due_datetime: new Date(form.due_datetime).toISOString() })
      onUpdated(); onClose()
    } catch {
      setError('Failed to update task.')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Edit Task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Task Name *</label>
          <input name="task_name" value={form.task_name} onChange={handle} required className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea name="description" value={form.description} onChange={handle} className="input min-h-[80px] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Due Date & Time *</label>
            <input type="datetime-local" name="due_datetime" value={form.due_datetime} onChange={handle} required className="input" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" value={form.priority} onChange={handle} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" value={form.status} onChange={handle} className="input">
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
