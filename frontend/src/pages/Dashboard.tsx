import { useEffect, useState } from 'react'
import MainLayout from '../components/layout/MainLayout'
import { getTasks } from '../services/api'
import { CheckSquare, Clock, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Task { id: string; priority: string; status: string; due_datetime: string }

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTasks().then(r => setTasks(r.data)).finally(() => setLoading(false))
  }, [])

  const total = tasks.length
  const pending = tasks.filter(t => t.status === 'pending').length
  const completed = tasks.filter(t => t.status === 'completed').length
  const now = new Date()
  const overdue = tasks.filter(t => new Date(t.due_datetime) < now && t.status !== 'completed').length
  const rate = total ? Math.round((completed / total) * 100) : 0

  const recent = [...tasks].sort((a, b) => new Date(b.due_datetime).getTime() - new Date(a.due_datetime).getTime()).slice(0, 5)

  const priBadge = (p: string) => ({ low: 'badge-low', medium: 'badge-medium', high: 'badge-high' }[p] ?? 'badge-low')

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6 max-w-6xl">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold text-white">Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋</h2>
          <p className="text-slate-400 text-sm mt-1">Here's what's on your plate today.</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={28} className="animate-spin text-brand-400" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<CheckSquare size={22} className="text-brand-400" />} label="Total Tasks" value={total} color="bg-brand-600/20" />
              <StatCard icon={<Clock size={22} className="text-amber-400" />} label="Pending" value={pending} color="bg-amber-500/20" />
              <StatCard icon={<AlertTriangle size={22} className="text-red-400" />} label="Overdue" value={overdue} color="bg-red-500/20" />
              <StatCard icon={<TrendingUp size={22} className="text-emerald-400" />} label="Completion" value={rate} color="bg-emerald-500/20" />
            </div>

            {/* Completion bar */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">Overall Progress</p>
                <p className="text-sm font-bold text-brand-400">{rate}%</p>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />{completed} Completed</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />{pending} Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />{overdue} Overdue</span>
              </div>
            </div>

            {/* Recent tasks */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h3 className="font-semibold text-white text-sm">Recent Tasks</h3>
              </div>
              {recent.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No tasks yet. Create your first task!</p>
              ) : (
                <ul className="divide-y divide-slate-800/60">
                  {recent.map(t => (
                    <li key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={priBadge(t.priority)}>{t.priority}</span>
                        <span className="text-sm text-slate-200">{(t as any).task_name}</span>
                      </div>
                      <span className={`text-xs ${t.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>{t.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
