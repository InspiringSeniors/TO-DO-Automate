import { useEffect, useState, useCallback } from 'react'
import MainLayout from '../components/layout/MainLayout'
import ResourceCard from '../components/resources/ResourceCard'
import UploadResourceModal from '../components/resources/UploadResourceModal'
import { getResources } from '../services/api'
import { Plus, Search, FolderOpen, Loader2 } from 'lucide-react'

interface Resource {
  id: string; title: string; description?: string; file_url: string
  file_type: string; created_at: string; uploaded_by?: string
}

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const fetchResources = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getResources(search || undefined)
      setResources(data)
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchResources() }, [fetchResources])

  return (
    <MainLayout title="Resources">
      <div className="space-y-5 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Resource Library</h2>
            <p className="text-slate-400 text-sm">{resources.length} shared file{resources.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Plus size={16} /> Upload Resource
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-400" /></div>
        ) : resources.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium">No resources found</p>
            <p className="text-slate-600 text-sm mt-1">Upload a file to share with your team</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map(r => <ResourceCard key={r.id} resource={r} onDeleted={fetchResources} />)}
          </div>
        )}
      </div>

      {showUpload && <UploadResourceModal onClose={() => setShowUpload(false)} onUploaded={fetchResources} />}
    </MainLayout>
  )
}
