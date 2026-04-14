import { Bell, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ title }: { title: string }) {
  const { user } = useAuth()
  const [dark, setDark] = useState(true)

  const toggleTheme = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
      <h1 className="font-semibold text-white text-lg">{title}</h1>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="btn-ghost p-2.5" title="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="btn-ghost p-2.5 relative" title="Notifications">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full" />
        </button>
        <div className="ml-2 w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
          {user?.full_name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
