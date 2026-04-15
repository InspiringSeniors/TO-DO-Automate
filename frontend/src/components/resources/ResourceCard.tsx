import { FileText, Download, Trash2, FileImage, File, User } from 'lucide-react'
import { deleteResource } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

interface Resource {
  id: string; title: string; description?: string; file_url: string
  file_type: string; created_at: string; uploaded_by?: string; uploader_name?: string
}

const iconMap: Record<string, React.ReactNode> = {
  pdf: <FileText size={20} className="text-red-400" />,
  png: <FileImage size={20} className="text-blue-400" />,
  jpg: <FileImage size={20} className="text-blue-400" />,
  jpeg: <FileImage size={20} className="text-blue-400" />,
  xlsx: <FileText size={20} className="text-emerald-400" />,
  csv: <FileText size={20} className="text-emerald-400" />,
  docx: <FileText size={20} className="text-indigo-400" />,
}

interface Props { resource: Resource; onDeleted: () => void }

export default function ResourceCard({ resource, onDeleted }: Props) {
  const { user, isAdmin } = useAuth()
  const canDelete = isAdmin || resource.uploaded_by === user?.id

  const handleDelete = async () => {
    if (!confirm('Delete this resource?')) return
    await deleteResource(resource.id); onDeleted()
  }

  return (
    <div className="card p-5 flex flex-col gap-3 group hover:border-slate-700 transition-all duration-150 hover:shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
          {iconMap[resource.file_type?.toLowerCase()] ?? <File size={20} className="text-slate-400" />}
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full uppercase mt-1">
          {resource.file_type}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug">{resource.title}</h3>
        {resource.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{resource.description}</p>}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600">{new Date(resource.created_at).toLocaleDateString()}</p>
        {resource.uploader_name && (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <User size={11} className="text-slate-600" />
            {resource.uploader_name}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-800">
        <a href={resource.file_url} target="_blank" rel="noreferrer" className="btn-ghost flex-1 justify-center text-xs py-1.5">
          <Download size={14} /> Download
        </a>
        {canDelete && (
          <button onClick={handleDelete} className="btn-danger text-xs py-1.5 px-3">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
