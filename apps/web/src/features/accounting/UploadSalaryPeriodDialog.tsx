import { useState } from 'react'
import { X } from 'lucide-react'
import { useUploadSalaryPeriod } from './accounting.hooks'

interface Props {
  open: boolean
  onClose: () => void
  onUploaded: (periodId: number) => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function UploadSalaryPeriodDialog({ open, onClose, onUploaded }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const upload = useUploadSalaryPeriod()

  if (!open) return null

  const handleClose = () => {
    if (upload.isPending) return
    setFile(null)
    setError('')
    onClose()
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!file) { setError('Vui lòng chọn file Excel bảng lương'); return }
    setError('')
    upload.mutate(
      { file, month, year },
      {
        onSuccess: (result) => { setFile(null); onUploaded(result.period.id) },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card">
          <h2 className="font-bold text-lg">Tải lên bảng lương</h2>
          <button onClick={handleClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Tháng</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={month}
                onChange={(e) => setMonth(+e.target.value)}
              >
                {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Năm</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(+e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">File Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              File đúng định dạng bảng lương chuẩn (dòng tiêu đề chứa "MSNV" ở cột C, dữ liệu cột B..AH, email cột AP).
            </p>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} disabled={upload.isPending} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={upload.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {upload.isPending ? 'Đang tải lên...' : 'Tải lên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
