import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMachines } from './machine.hooks'
import { factoryApi } from '@/features/factory/factory.api'
import { useAuthStore } from '@/stores/auth.store'
import { WORK_TYPE_LABELS, type WorkType } from './work-order.api'
import type { CreateWorkPlanDto, WorkPlanItemInput, WorkPlan } from './maintenance-plan.api'

interface Props {
  open: boolean
  plan?: WorkPlan | null
  defaultType?: WorkType
  /** Dòng công việc điền sẵn — dùng khi tạo kế hoạch từ bảng dự tính bảo dưỡng */
  initialItems?: WorkPlanItemInput[]
  onClose: () => void
  onSubmit: (dto: CreateWorkPlanDto) => void
  isPending?: boolean
}

const firstOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const lastOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

/** Form lập / sửa kế hoạch sửa chữa – bảo dưỡng, kèm danh sách dòng công việc theo máy. */
export function WorkPlanFormDialog({
  open, plan, defaultType = 'MAINTENANCE', initialItems, onClose, onSubmit, isPending,
}: Props) {
  const [type, setType] = useState<WorkType>(defaultType)
  const [factoryId, setFactoryId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [periodFrom, setPeriodFrom] = useState(firstOfMonth())
  const [periodTo, setPeriodTo] = useState(lastOfMonth())
  const [note, setNote] = useState('')
  const [items, setItems] = useState<WorkPlanItemInput[]>([])
  const [error, setError] = useState('')

  const { user } = useAuthStore()
  const isCompanyLevel = !user?.factoryId

  const { data: machinesData } = useMachines({ pageSize: 500 })
  const machines = machinesData?.data ?? []
  const { data: factories } = useQuery({
    queryKey: ['factories-all'],
    queryFn: () => factoryApi.list({ pageSize: 100 }),
    enabled: open && isCompanyLevel,
  })

  useEffect(() => {
    if (!open) return
    setError('')
    if (plan) {
      setType(plan.type)
      setFactoryId(plan.factoryId)
      setTitle(plan.title)
      setPeriodFrom(plan.periodFrom.slice(0, 10))
      setPeriodTo(plan.periodTo.slice(0, 10))
      setNote(plan.note ?? '')
      setItems((plan.items ?? []).map((i) => ({
        machineId: i.machineId,
        normId: i.normId ?? undefined,
        plannedDate: i.plannedDate.slice(0, 10),
        content: i.content,
        estimatedCost: i.estimatedCost != null ? Number(i.estimatedCost) : undefined,
        note: i.note ?? undefined,
      })))
    } else {
      setType(defaultType)
      setFactoryId('')
      setTitle(
        defaultType === 'MAINTENANCE'
          ? `Kế hoạch bảo dưỡng tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`
          : `Kế hoạch sửa chữa tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      )
      setPeriodFrom(firstOfMonth())
      setPeriodTo(lastOfMonth())
      setNote('')
      setItems(initialItems ?? [])
    }
  }, [open, plan, defaultType, initialItems])

  if (!open) return null

  const addItem = () => setItems([...items, { machineId: 0, plannedDate: periodFrom, content: '' }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, patch: Partial<WorkPlanItemInput>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const total = items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">
            {plan ? `Sửa kế hoạch ${plan.planNo}` : `Lập kế hoạch ${WORK_TYPE_LABELS[type].toLowerCase()}`}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) { setError('Tên kế hoạch không được để trống'); return }
            if (new Date(periodTo) < new Date(periodFrom)) { setError('Ngày kết thúc phải sau ngày bắt đầu'); return }
            if (isCompanyLevel && !plan && !factoryId) { setError('Phải chọn xưởng lập kế hoạch'); return }
            const cleanItems = items.filter((i) => i.machineId && i.content.trim() && i.plannedDate)
            if (cleanItems.length === 0) { setError('Kế hoạch phải có ít nhất một dòng công việc'); return }
            onSubmit({
              type,
              factoryId: factoryId ? Number(factoryId) : undefined,
              title: title.trim(),
              periodFrom,
              periodTo,
              note: note.trim() || undefined,
              items: cleanItems,
            })
          }}
          className="p-5 space-y-3"
        >
          <div className="d-flex gap-2 flex-wrap">
            <div style={{ width: 170 }}>
              <label className="text-sm font-medium mb-1 block">Loại kế hoạch *</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as WorkType)} disabled={!!plan}>
                {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((t) => (
                  <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {isCompanyLevel && (
              <div style={{ width: 220 }}>
                <label className="text-sm font-medium mb-1 block">Xưởng *</label>
                <select className="w-full rounded-lg border px-3 py-2 text-sm" value={factoryId} onChange={(e) => setFactoryId(e.target.value ? Number(e.target.value) : '')} disabled={!!plan}>
                  <option value="">— Chọn xưởng —</option>
                  {factories?.data.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex-fill" style={{ minWidth: 240 }}>
              <label className="text-sm font-medium mb-1 block">Tên kế hoạch *</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Từ ngày *</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div className="flex-fill">
              <label className="text-sm font-medium mb-1 block">Đến ngày *</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="text-sm font-medium">Danh sách công việc theo máy *</label>
              <button type="button" onClick={addItem} className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1">
                <Plus size={14} /> Thêm dòng
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-muted small border rounded-lg p-3 text-center">Chưa có dòng công việc nào</div>
            ) : (
              <div className="table-responsive border rounded-lg">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '25%' }}>Máy</th><th>Nội dung</th>
                      <th style={{ width: 145 }}>Ngày dự kiến</th><th style={{ width: 120 }}>Chi phí DK</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <select className="form-select form-select-sm" value={it.machineId || ''} onChange={(e) => updateItem(idx, { machineId: Number(e.target.value) })}>
                            <option value="">— Chọn máy —</option>
                            {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                          </select>
                        </td>
                        <td><input className="form-control form-control-sm" value={it.content} onChange={(e) => updateItem(idx, { content: e.target.value })} placeholder="Nội dung công việc" /></td>
                        <td><input type="date" className="form-control form-control-sm" value={it.plannedDate} onChange={(e) => updateItem(idx, { plannedDate: e.target.value })} /></td>
                        <td><input type="number" min={0} className="form-control form-control-sm" value={it.estimatedCost ?? ''} onChange={(e) => updateItem(idx, { estimatedCost: e.target.value ? Number(e.target.value) : undefined })} /></td>
                        <td className="text-center">
                          <button type="button" onClick={() => removeItem(idx)} className="btn btn-sm btn-outline-danger px-2"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > 0 && (
              <div className="text-end small mt-1">Tổng chi phí dự kiến: <strong>{total.toLocaleString('vi-VN')} đ</strong></div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ghi chú</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : plan ? 'Cập nhật' : 'Lập kế hoạch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
