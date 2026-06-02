import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Style, CreateStyleDto } from './style.api'
import { useCustomersActive } from '@/features/customer/customer.hooks'

interface Props {
  open: boolean
  style?: Style | null
  onClose: () => void
  onSubmit: (dto: CreateStyleDto) => void
  isPending?: boolean
}

export function StyleFormDialog({ open, style, onClose, onSubmit, isPending }: Props) {
  const { data: customers = [] } = useCustomersActive()
  const [form, setForm] = useState<CreateStyleDto>({ name: '', customerId: 0, season: '', image: '', description: '', sam: undefined })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(
        style
          ? { name: style.name, customerId: style.customerId, season: style.season ?? '', image: style.image ?? '', description: style.description ?? '', sam: style.sam ? +style.sam : undefined }
          : { name: '', customerId: customers[0]?.id ?? 0, season: '', image: '', description: '', sam: undefined },
      )
      setErrors({})
    }
  }, [open, style, customers])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Tên không được để trống'
    if (!form.customerId) e.customerId = 'Vui lòng chọn khách hàng'
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
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card">
          <h2 className="font-bold text-lg">{style ? 'Cập nhật mã hàng' : 'Thêm mã hàng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {style && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Mã hàng: </span>
              <code className="font-semibold">{style.code}</code>
            </div>
          )}
          <Field label="Tên mã hàng *" error={errors.name}>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Khách hàng *" error={errors.customerId}>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: +e.target.value })}>
              <option value={0}>-- Chọn khách hàng --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </Field>
          <Field label="Mùa vụ">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="VD: SS2024" value={form.season ?? ''} onChange={(e) => setForm({ ...form, season: e.target.value })} />
          </Field>
          <Field label="SAM (phút/sản phẩm)">
            <input type="number" min={0} step="0.0001" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.sam ?? ''} onChange={(e) => setForm({ ...form, sam: e.target.value ? +e.target.value : undefined })} />
          </Field>
          <Field label="Ảnh (URL)">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://..." value={form.image ?? ''} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          </Field>
          <Field label="Mô tả">
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : style ? 'Cập nhật' : 'Tạo mới'}
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
