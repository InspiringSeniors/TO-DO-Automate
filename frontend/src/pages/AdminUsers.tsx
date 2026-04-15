import { useEffect, useState } from 'react'
import MainLayout from '../components/layout/MainLayout'
import Modal from '../components/common/Modal'
import UserTasksPanel from '../components/admin/UserTasksPanel'
import { getUsers, createUser } from '../services/api'
import { UserPlus, Shield, User, Loader2, ClipboardList } from 'lucide-react'

interface UserItem {
  id: string; full_name: string; email: string
  username: string; role: string; created_at: string
}

export default function AdminUsers() {
  const [users, setUsers]           = useState<UserItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [form, setForm]             = useState({ full_name: '', email: '', username: '', password: '', role: 'employee' })
  const [creating, setCreating]     = useState(false)
  const [err, setErr]               = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await getUsers()
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setErr('')
    try {
      await createUser(form)
      setShowCreate(false)
      setForm({ full_name: '', email: '', username: '', password: '', role: 'employee' })
      fetchUsers()
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Failed to create user')
    } finally { setCreating(false) }
  }

  return (
    <MainLayout title="User Management">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Team Members</h2>
            <p className="text-slate-400 text-sm">
              {users.length} account{users.length !== 1 ? 's' : ''} · click a row to view their tasks
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <UserPlus size={16} /> Create User
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Name', 'Username', 'Email', 'Role', 'Joined', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center
                                        text-xs font-bold text-white shrink-0">
                          {u.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-white group-hover:text-brand-400 transition-colors">
                          {u.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${u.role === 'admin' ? 'bg-brand-600/20 text-brand-400' : 'bg-slate-700 text-slate-300'}`}>
                        {u.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    {/* View tasks hint */}
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100
                                       transition-opacity text-xs text-brand-400 font-medium">
                        <ClipboardList size={13} />
                        View tasks
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User tasks slide-over panel */}
      {selectedUser && (
        <UserTasksPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Create user modal */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                  required className="input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label">Username *</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  required className="input" placeholder="jane_doe" />
              </div>
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                required className="input" placeholder="jane@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  required className="input" />
              </div>
              <div>
                <label className="label">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </MainLayout>
  )
}
