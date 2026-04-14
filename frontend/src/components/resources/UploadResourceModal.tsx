import { useState, useRef } from 'react'
import Modal from '../common/Modal'
import { uploadResource } from '../../services/api'
import { UploadCloud } from 'lucide-react'

interface Props { onClose: () => void; onUploaded: () => void }

export default function UploadResourceModal({ onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')) }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title)
      fd.append('description', description)
      await uploadResource(fd)
      onUploaded(); onClose()
    } catch {
      setError('Upload failed. Ensure the file type is allowed.')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Upload Resource" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragging ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700 hover:border-brand-600 hover:bg-slate-800/40'}`}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={handleFile}
            accept=".pdf,.docx,.ppt,.pptx,.xlsx,.csv,.txt,.png,.jpg,.jpeg" />
          <UploadCloud className="mx-auto mb-2 text-slate-400" size={32} />
          {file
            ? <p className="text-white font-medium text-sm">{file.name}</p>
            : <><p className="text-slate-300 text-sm font-medium">Drag & drop or click to browse</p>
               <p className="text-slate-500 text-xs mt-1">PDF · DOCX · XLSX · IMG · TXT · CSV · PPT</p></>}
        </div>

        <div>
          <label className="label">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" placeholder="Document title" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[72px] resize-none" placeholder="Optional description..." />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={!file || !title || loading} className="btn-primary">
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
