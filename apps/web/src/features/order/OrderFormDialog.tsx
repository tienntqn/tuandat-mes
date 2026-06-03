import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { ORDER_STATUS_LABELS, type Order, type CreateOrderDto } from './order.api'
import { useCustomersActive } from '@/features/customer/customer.hooks'

interface Props {
  open: boolean
  order?: Order | null
  onClose: () => void
  onSubmit: (dto: CreateOrderDto) => void
  isPending?: boolean
}

const today = () => new Date().toISOString().split('T')[0]

export function OrderFormDialog({ open, order, onClose, onSubmit, isPending }: Props) {
  const { data: customers = [] } = useCustomersActive()
  const [form, setForm] = useState<CreateOrderDto>({ customerId: 0, orderDate: today(), deliveryDate: '', status: 'OPEN', note: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset khi mở/đổi order — KHÔNG để `customers` trong deps (tránh mất ký tự đang gõ).
  useEffect(() => {
    if (open) {
      setForm(
        order
          ? {
              orderNumber: order.orderNumber,
              customerId: order.customerId,
              orderDate: order.orderDate.split('T')[0],
              deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : '',
              status: order.status,
              note: order.note ?? '',
            }
          : { customerId: 0, orderDate: today(), deliveryDate: '', status: 'OPEN', note: '' },
      )
      setErrors({})
    }
  }, [open, order])

  // Tự chọn khách hàng đầu tiên khi tải xong (chỉ khi tạo mới & chưa chọn).
  useEffect(() => {
    if (open && !order && customers.length > 0) {
      setForm((f) => (f.customerId ? f : { ...f, customerId: customers[0].id }))
    }
  }, [open, order, customers])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.customerId) e.customerId = 'Vui lòng chọn khách hàng'
    if (!form.orderDate) e.orderDate = 'Vui lòng chọn ngày đặt hàng'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit({ ...form, deliveryDate: form.deliveryDate || undefined })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{order ? 'Cập nhật đơn hàng' : 'Tạo đơn đặt hàng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {order && (
            <Field label="Số đơn hàng">
              <input className="w-full rounded-lg border px-3 py-2 text-sm bg-muted" value={form.orderNumber ?? ''} disabled />
            </Field>
          )}
          <Field label="Khách hàng *" error={errors.customerId}>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: +e.target.value })}>
              <option value={0}>-- Chọn khách hàng --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </Field>
          <Field label="Ngày đặt hàng *" error={errors.orderDate}>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          </Field>
          <Field label="Ngày giao hàng">
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.deliveryDate ?? ''} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          </Field>
          <Field label="Trạng thái">
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : order ? 'Cập nhật' : 'Tạo mới'}
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
