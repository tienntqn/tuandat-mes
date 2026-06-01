import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { FactoryPlan, UpdateFactoryPlanDto } from './plan.api'

interface Props {
  open: boolean
  onClose: () => void
  factoryPlan: FactoryPlan
  onSubmit: (dto: UpdateFactoryPlanDto) => void
  loading?: boolean
}

export function FactoryPlanEditDialog({ open, onClose, factoryPlan, onSubmit, loading }: Props) {
  const [plannedQuantity, setPlannedQuantity] = useState('')
  const [expectedFinishDate, setExpectedFinishDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPlannedQuantity(String(factoryPlan.plannedQuantity))
      setExpectedFinishDate(factoryPlan.expectedFinishDate.slice(0, 10))
      setError('')
    }
  }, [open, factoryPlan])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!plannedQuantity || Number(plannedQuantity) <= 0) {
      setError('Số lượng phải lớn hơn 0')
      return
    }
    onSubmit({
      plannedQuantity: Number(plannedQuantity),
      expectedFinishDate,
    })
  }

  const cp = factoryPlan.companyPlan
  const line = factoryPlan.line

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl border">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Sửa kế hoạch chuyền</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Chuyền {line?.lineNumber} — {line?.name}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {cp && (
            <div className="rounded-lg bg-muted/30 border p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã hàng:</span>
                <span className="font-medium">{cp.style?.code} — {cp.style?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chỉ tiêu xưởng:</span>
                <span className="font-medium">{cp.plannedQuantity?.toLocaleString()} SP</span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">Số lượng (SP) *</label>
            <input
              type="number"
              min={1}
              value={plannedQuantity}
              onChange={(e) => setPlannedQuantity(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Deadline</label>
            <input
              type="date"
              value={expectedFinishDate}
              onChange={(e) => setExpectedFinishDate(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
