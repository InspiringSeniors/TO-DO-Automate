import { useState, useRef } from 'react'
import Modal from '../common/Modal'
import { uploadExcel } from '../../services/api'
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from 'lucide-react'

interface Props { onClose: () => void; onUploaded: () => void }

interface Stats { total_processed: number; created: number; updated: number; invalid: number }

export default function UploadExcelModal({ onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.xlsx')) setFile(f)
    else setError('Only .xlsx files are supported.')
  }

  const submit = async () => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const { data } = await uploadExcel(file)
      setResult(data.stats)
      onUploaded()
    } catch {
      setError('Upload failed. Check the file format and try again.')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Upload Excel Tasks" onClose={onClose} size="md">
      {result ? (
        <div className="text-center py-4 animate-slide-up">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={40} />
          <p className="text-white font-semibold text-lg mb-4">Upload Complete!</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[['Created', result.created, 'text-emerald-400'], ['Updated', result.updated, 'text-blue-400'], ['Invalid', result.invalid, 'text-red-400']].map(([label, val, cls]) => (
              <div key={label as string} className="card p-3 text-center">
                <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150
              ${dragging ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700 hover:border-brand-600 hover:bg-slate-800/50'}`}
          >
            <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <UploadCloud className="mx-auto mb-3 text-slate-400" size={36} />
            <p className="text-slate-300 font-medium">Drag & drop your Excel file here</p>
            <p className="text-slate-500 text-sm mt-1">or <span className="text-brand-400 underline">browse files</span> · .xlsx only</p>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700">
              <FileSpreadsheet size={20} className="text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 text-xs">Remove</button>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="text-xs text-slate-500 bg-slate-800/50 rounded-xl p-3">
            <p className="font-medium text-slate-400 mb-1">Required columns:</p>
            <p>Task Name · Description · Due Date · Due Time · Priority · Status</p>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={submit} disabled={!file || loading} className="btn-primary">
              {loading ? 'Uploading...' : 'Upload & Sync'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
