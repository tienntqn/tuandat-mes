import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Size, CreateSizeDto } from './size.api'

interface Props {
  open: boolean
  size?: Size | null
  onClose: () => void
  onSubmit: (dto: CreateSizeDto) => void
  isPending?: boolean
}

export function SizeFormDialog({ open, size, onClose, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CreateSizeDto>({ code: '', name: '', sortOrder: 0 })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(
        size
          ? { code: size.code, name: size.name, sortOrder: size.sortOrder }
          : { code: '', name: '', sortOrder: 0 },
      )
      setErrors({})
    }
  }, [open, size])

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Tên size không được để trống' }); return }
    onSubmit({ ...form, code: form.code?.trim() || undefined })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{size ? 'Cập nhật size' : 'Thêm size'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Mã size (vd S, M, L — bỏ trống để tự sinh)">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VD: XL" />
          </Field>
          <Field label="Tên size *" error={errors.name}>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: XL" />
          </Field>
          <Field label="Thứ tự sắp xếp">
            <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : size ? 'Cập nhật' : 'Tạo mới'}
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
