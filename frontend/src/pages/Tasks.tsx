import { useEffect, useState, useCallback } from 'react'
import MainLayout from '../components/layout/MainLayout'
import TaskTable from '../components/tasks/TaskTable'
import TaskFilterPanel from '../components/tasks/TaskFilterPanel'
import AddTaskModal from '../components/tasks/AddTaskModal'
import EditTaskModal from '../components/tasks/EditTaskModal'
import UploadExcelModal from '../components/tasks/UploadExcelModal'
import SmartPriorityPanel from '../components/tasks/SmartPriorityPanel'
import { getTasks, exportTasksExcel } from '../services/api'
import { Plus, Upload, Download, Loader2 } from 'lucide-react'

interface Task {
  id: string; task_name: string; description?: string
  due_datetime: string; priority: string; status: string; source: string
}

const initFilters = { search: '', status: '', priority: '', overdue: false, due_today: false }

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(initFilters)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, headers } = await exportTasksExcel()
      const url = URL.createObjectURL(new Blob([data], { type: headers['content-type'] }))
      const link = document.createElement('a')
      link.href = url
      const cd = headers['content-disposition'] || ''
      const match = cd.match(/filename="?([^"]+)"?/)
      link.download = match ? match[1] : 'tasks.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.search) params.search = filters.search
      if (filters.overdue) params.overdue = true
      if (filters.due_today) params.due_today = true
      const { data } = await getTasks(params)
      setTasks(data)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  return (
    <MainLayout title="Tasks">
      <div className="space-y-5 max-w-6xl">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Task Manager</h2>
            <p className="text-slate-400 text-sm">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} disabled={exporting} className="btn-ghost">
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export Excel
            </button>
            <button onClick={() => setShowExcel(true)} className="btn-ghost">
              <Upload size={16} /> Import Excel
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> New Task
            </button>
          </div>
        </div>

        {/* Smart Prioritization */}
        <SmartPriorityPanel tasks={tasks} onRefresh={fetchTasks} />

        {/* Filters */}
        <TaskFilterPanel filters={filters} onChange={setFilters} />

        {/* Table */}
        {loading
          ? <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-400" /></div>
          : <TaskTable tasks={tasks} onRefresh={fetchTasks} onEdit={setEditTask} />
        }
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onCreated={fetchTasks} />}
      {showExcel && <UploadExcelModal onClose={() => setShowExcel(false)} onUploaded={fetchTasks} />}
      {editTask && <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onUpdated={fetchTasks} />}
    </MainLayout>
  )
}
