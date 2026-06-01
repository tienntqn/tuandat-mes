import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Customer, CreateCustomerDto } from './customer.api'

interface Props {
  open: boolean
  customer?: Customer | null
  onClose: () => void
  onSubmit: (dto: CreateCustomerDto) => void
  isPending?: boolean
}

export function CustomerFormDialog({ open, customer, onClose, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CreateCustomerDto>({ code: '', name: '', country: '', contactInfo: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(customer ? { code: customer.code, name: customer.name, country: customer.country ?? '', contactInfo: customer.contactInfo ?? '' } : { code: '', name: '', country: '', contactInfo: '' })
      setErrors({})
    }
  }, [open, customer])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.code.trim()) e.code = 'Mã khách hàng không được để trống'
    if (!form.name.trim()) e.name = 'Tên khách hàng không được để trống'
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
          <h2 className="font-bold text-lg">{customer ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Mã khách hàng *" error={errors.code}>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code} disabled={!!customer} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Tên khách hàng *" error={errors.name}>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Quốc gia">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="Thông tin liên hệ">
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.contactInfo ?? ''} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : customer ? 'Cập nhật' : 'Tạo mới'}
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
