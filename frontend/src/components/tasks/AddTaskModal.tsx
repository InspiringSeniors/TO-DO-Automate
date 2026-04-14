import { useState } from 'react'
import Modal from '../common/Modal'
import { createTask } from '../../services/api'

interface Props { onClose: () => void; onCreated: () => void }

export default function AddTaskModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({ task_name: '', description: '', due_datetime: '', priority: 'medium' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await createTask({ ...form, due_datetime: new Date(form.due_datetime).toISOString() })
      onCreated(); onClose()
    } catch {
      setError('Failed to create task. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Add New Task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Task Name *</label>
          <input name="task_name" value={form.task_name} onChange={handle} required className="input" placeholder="e.g. Submit quarterly report" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea name="description" value={form.description} onChange={handle} className="input min-h-[80px] resize-none" placeholder="Optional details..." />
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
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
