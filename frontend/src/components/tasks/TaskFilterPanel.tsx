import { Search } from 'lucide-react'

interface Filters {
  search: string; status: string; priority: string; overdue: boolean; due_today: boolean
}
interface Props { filters: Filters; onChange: (f: Filters) => void }

export default function TaskFilterPanel({ filters, onChange }: Props) {
  const set = (key: keyof Filters, value: unknown) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>

      {/* Status */}
      <select value={filters.status} onChange={(e) => set('status', e.target.value)} className="input w-auto">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>

      {/* Priority */}
      <select value={filters.priority} onChange={(e) => set('priority', e.target.value)} className="input w-auto">
        <option value="">All Priority</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      {/* Toggle chips */}
      <button
        onClick={() => set('due_today', !filters.due_today)}
        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${filters.due_today ? 'bg-brand-600/20 text-brand-400 border-brand-600/40' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}
      >
        Due Today
      </button>
      <button
        onClick={() => set('overdue', !filters.overdue)}
        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${filters.overdue ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}
      >
        Overdue
      </button>
    </div>
  )
}
