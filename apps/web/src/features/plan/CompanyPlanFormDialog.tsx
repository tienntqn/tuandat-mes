import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { styleApi } from '@/features/style/style.api'
import { poApi } from '@/features/purchase-order/po.api'
import { factoryApi } from '@/features/factory/factory.api'
import type { CompanyPlan, CreateCompanyPlanDto } from './plan.api'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateCompanyPlanDto) => void
  initial: CompanyPlan | null
  loading?: boolean
}

export function CompanyPlanFormDialog({ open, onClose, onSubmit, initial, loading }: Props) {
  const [styleId, setStyleId] = useState('')
  const [poId, setPoId] = useState('')
  const [factoryId, setFactoryId] = useState('')
  const [plannedQuantity, setPlannedQuantity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expectedFinishDate, setExpectedFinishDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: styles } = useQuery({ queryKey: ['styles-active'], queryFn: () => styleApi.active() })
  const { data: posData } = useQuery({
    queryKey: ['pos-by-style', styleId],
    queryFn: () => poApi.list({ styleId: Number(styleId), pageSize: 100 }),
    enabled: !!styleId,
  })
  const { data: factories } = useQuery({
    queryKey: ['factories-all'],
    queryFn: () => factoryApi.list({ pageSize: 100 }),
  })

  // Thông tin PO để hiển thị tổng SL và deadline
  const selectedPo = posData?.data?.find((p) => p.id === Number(poId))

  useEffect(() => {
    if (initial) {
      setStyleId(String(initial.styleId))
      setPoId(String(initial.poId))
      setFactoryId(String(initial.factoryId))
      setPlannedQuantity(String(initial.plannedQuantity))
      setStartDate(initial.startDate.slice(0, 10))
      setExpectedFinishDate(initial.expectedFinishDate.slice(0, 10))
    } else {
      setStyleId('')
      setPoId('')
      setFactoryId('')
      setPlannedQuantity('')
      setStartDate('')
      setExpectedFinishDate('')
    }
    setErrors({})
  }, [initial, open])

  if (!open) return null

  const validate = () => {
    const e: Record<string, string> = {}
    if (!styleId) e.styleId = 'Chọn mã hàng'
    if (!poId) e.poId = 'Chọn PO'
    if (!factoryId) e.factoryId = 'Chọn xưởng'
    if (!plannedQuantity || Number(plannedQuantity) <= 0) e.plannedQuantity = 'Số lượng phải > 0'
    if (!startDate) e.startDate = 'Chọn ngày bắt đầu'
    if (!expectedFinishDate) e.expectedFinishDate = 'Chọn ngày kết thúc'
    if (startDate && expectedFinishDate && startDate > expectedFinishDate) {
      e.expectedFinishDate = 'Ngày kết thúc phải sau ngày bắt đầu'
    }
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit({
      styleId: Number(styleId),
      poId: Number(poId),
      factoryId: Number(factoryId),
      plannedQuantity: Number(plannedQuantity),
      startDate,
      expectedFinishDate,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card shadow-xl border">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {initial ? 'Cập nhật kế hoạch công ty' : 'Thêm kế hoạch công ty'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mã hàng */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Mã hàng *</label>
            <select
              value={styleId}
              onChange={(e) => { setStyleId(e.target.value); setPoId('') }}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              disabled={!!initial}
            >
              <option value="">— Chọn mã hàng —</option>
              {styles?.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
            {errors.styleId && <p className="mt-1 text-xs text-destructive">{errors.styleId}</p>}
          </div>

          {/* PO */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">PO *</label>
            <select
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              disabled={!styleId || !!initial}
            >
              <option value="">— Chọn PO —</option>
              {posData?.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poNumber} · {p.totalQuantity.toLocaleString()} SP · hạn {new Date(p.deliveryDate).toLocaleDateString('vi-VN')}
                </option>
              ))}
            </select>
            {errors.poId && <p className="mt-1 text-xs text-destructive">{errors.poId}</p>}
            {selectedPo && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tổng PO: <span className="font-medium">{selectedPo.totalQuantity.toLocaleString()} SP</span>
                {' · '}Giao hàng: {new Date(selectedPo.deliveryDate).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>

          {/* Xưởng */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Xưởng *</label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              disabled={!!initial}
            >
              <option value="">— Chọn xưởng —</option>
              {factories?.data?.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
              ))}
            </select>
            {errors.factoryId && <p className="mt-1 text-xs text-destructive">{errors.factoryId}</p>}
          </div>

          {/* Số lượng */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Chỉ tiêu (SP) *</label>
            <input
              type="number"
              min={1}
              value={plannedQuantity}
              onChange={(e) => setPlannedQuantity(e.target.value)}
              placeholder="VD: 5000"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            {errors.plannedQuantity && <p className="mt-1 text-xs text-destructive">{errors.plannedQuantity}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ngày bắt đầu *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              {errors.startDate && <p className="mt-1 text-xs text-destructive">{errors.startDate}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Deadline *</label>
              <input
                type="date"
                value={expectedFinishDate}
                onChange={(e) => setExpectedFinishDate(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              {errors.expectedFinishDate && <p className="mt-1 text-xs text-destructive">{errors.expectedFinishDate}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Tạo kế hoạch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
