import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { DELIVERY_STATUS_LABELS, type DeliveryPlan, type CreateDeliveryPlanDto } from './delivery.api'
import { usePurchaseOrders } from '@/features/purchase-order/po.hooks'

interface Props {
  open: boolean
  plan?: DeliveryPlan | null
  onClose: () => void
  onSubmit: (dto: CreateDeliveryPlanDto) => void
  isPending?: boolean
}

const today = () => new Date().toISOString().split('T')[0]

export function DeliveryPlanFormDialog({ open, plan, onClose, onSubmit, isPending }: Props) {
  const { data: poData } = usePurchaseOrders({ pageSize: 200 })
  const pos = poData?.data ?? []

  const [form, setForm] = useState<CreateDeliveryPlanDto>({ poId: 0, plannedDate: today(), plannedQuantity: 0, status: 'PENDING' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset khi mở/đổi plan — KHÔNG để `pos` trong deps (tránh mất ký tự đang gõ).
  useEffect(() => {
    if (open) {
      setForm(
        plan
          ? {
              poId: plan.poId,
              plannedDate: plan.plannedDate.split('T')[0],
              plannedQuantity: plan.plannedQuantity,
              actualDate: plan.actualDate ? plan.actualDate.split('T')[0] : '',
              actualQuantity: plan.actualQuantity ?? undefined,
              status: plan.status,
              note: plan.note ?? '',
            }
          : { poId: 0, plannedDate: today(), plannedQuantity: 0, status: 'PENDING' },
      )
      setErrors({})
    }
  }, [open, plan])

  // Tự chọn PO đầu tiên khi tải xong (chỉ khi tạo mới & chưa chọn).
  useEffect(() => {
    if (open && !plan && pos.length > 0) {
      setForm((f) => (f.poId ? f : { ...f, poId: pos[0].id }))
    }
  }, [open, plan, pos])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.poId) e.poId = 'Vui lòng chọn PO'
    if (!form.plannedDate) e.plannedDate = 'Vui lòng chọn ngày giao dự kiến'
    if (!form.plannedQuantity || form.plannedQuantity < 1) e.plannedQuantity = 'Số lượng phải lớn hơn 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) {
      onSubmit({
        ...form,
        actualDate: form.actualDate || undefined,
        actualQuantity: form.actualQuantity ?? undefined,
      })
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{plan ? 'Cập nhật kế hoạch giao hàng' : 'Tạo kế hoạch giao hàng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="PO *" error={errors.poId}>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.poId} disabled={!!plan} onChange={(e) => setForm({ ...form, poId: +e.target.value })}>
              <option value={0}>-- Chọn PO --</option>
              {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber} — {p.style?.code} ({p.totalQuantity.toLocaleString()} SP)</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày giao dự kiến *" error={errors.plannedDate}>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
            </Field>
            <Field label="SL dự kiến *" error={errors.plannedQuantity}>
              <input type="number" min={1} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plannedQuantity || ''} onChange={(e) => setForm({ ...form, plannedQuantity: +e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày giao thực tế">
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.actualDate ?? ''} onChange={(e) => setForm({ ...form, actualDate: e.target.value })} />
            </Field>
            <Field label="SL thực giao">
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.actualQuantity ?? ''} onChange={(e) => setForm({ ...form, actualQuantity: e.target.value === '' ? undefined : +e.target.value })} />
            </Field>
          </div>
          <Field label="Trạng thái">
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : plan ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
