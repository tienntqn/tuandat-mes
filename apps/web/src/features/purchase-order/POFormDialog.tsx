import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { PurchaseOrder, CreatePODto } from './po.api'
import { PO_STATUS_LABELS } from './po.api'
import { useStylesActive } from '@/features/style/style.hooks'

interface Props {
  open: boolean
  po?: PurchaseOrder | null
  onClose: () => void
  onSubmit: (dto: CreatePODto) => void
  isPending?: boolean
}

export function POFormDialog({ open, po, onClose, onSubmit, isPending }: Props) {
  const { data: styles = [] } = useStylesActive()
  const [form, setForm] = useState<CreatePODto>({ poNumber: '', styleId: 0, totalQuantity: 0, deliveryDate: '', status: 'OPEN' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(
        po
          ? { poNumber: po.poNumber, styleId: po.styleId, totalQuantity: po.totalQuantity, deliveryDate: po.deliveryDate.split('T')[0], status: po.status }
          : { poNumber: '', styleId: styles[0]?.id ?? 0, totalQuantity: 0, deliveryDate: '', status: 'OPEN' },
      )
      setErrors({})
    }
  }, [open, po, styles])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.poNumber.trim()) e.poNumber = 'Số PO không được để trống'
    if (!form.styleId) e.styleId = 'Vui lòng chọn mã hàng'
    if (!form.totalQuantity || form.totalQuantity < 1) e.totalQuantity = 'Số lượng phải lớn hơn 0'
    if (!form.deliveryDate) e.deliveryDate = 'Vui lòng chọn ngày giao hàng'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit(form)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{po ? 'Cập nhật PO' : 'Tạo Purchase Order'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Số PO *" error={errors.poNumber}>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.poNumber} disabled={!!po} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
          </Field>
          <Field label="Mã hàng *" error={errors.styleId}>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.styleId} onChange={(e) => setForm({ ...form, styleId: +e.target.value })}>
              <option value={0}>-- Chọn mã hàng --</option>
              {styles.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.customer?.name})</option>)}
            </select>
          </Field>
          <Field label="Số lượng *" error={errors.totalQuantity}>
            <input type="number" min={1} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.totalQuantity || ''} onChange={(e) => setForm({ ...form, totalQuantity: +e.target.value })} />
          </Field>
          <Field label="Ngày giao hàng *" error={errors.deliveryDate}>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          </Field>
          <Field label="Trạng thái">
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(PO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : po ? 'Cập nhật' : 'Tạo mới'}
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
