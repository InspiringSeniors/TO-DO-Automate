import { useState } from 'react'
import Modal from '../common/Modal'

interface Activity {
  id: string; title: string; description?: string
  due_datetime: string; status: string
}

interface Props {
  mode: 'add' | 'edit'
  activity?: Activity
  onClose: () => void
  onSubmit: (data: { title: string; description?: string; due_datetime: string; status?: string }) => Promise<void>
}

export default function ActivityModal({ mode, activity, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    title: activity?.title ?? '',
    description: activity?.description ?? '',
    due_datetime: activity?.due_datetime
      ? new Date(activity.due_datetime).toISOString().slice(0, 16)
      : '',
    status: activity?.status === 'overdue' ? 'pending' : (activity?.status ?? 'pending'),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await onSubmit({
        title: form.title,
        description: form.description || undefined,
        due_datetime: new Date(form.due_datetime).toISOString(),
        ...(mode === 'edit' ? { status: form.status } : {}),
      })
      onClose()
    } catch {
      setError('Failed to save activity. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <Modal title={mode === 'add' ? 'Add Activity' : 'Edit Activity'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Activity Name *</label>
          <input name="title" value={form.title} onChange={handle} required className="input"
            placeholder="e.g. Draft proposal document" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea name="description" value={form.description} onChange={handle}
            className="input min-h-[72px] resize-none" placeholder="Optional details..." />
        </div>
        <div className={mode === 'edit' ? 'grid grid-cols-2 gap-4' : ''}>
          <div>
            <label className="label">Due Date & Time *</label>
            <input type="datetime-local" name="due_datetime" value={form.due_datetime}
              onChange={handle} required className="input" />
          </div>
          {mode === 'edit' && (
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handle} className="input">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : mode === 'add' ? 'Add Activity' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
