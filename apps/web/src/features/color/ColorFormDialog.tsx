import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Color, CreateColorDto } from './color.api'

interface Props {
  open: boolean
  color?: Color | null
  onClose: () => void
  onSubmit: (dto: CreateColorDto) => void
  isPending?: boolean
}

export function ColorFormDialog({ open, color, onClose, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CreateColorDto>({ code: '', name: '', hex: '#3366CC' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(
        color
          ? { code: color.code, name: color.name, hex: color.hex ?? '#3366CC' }
          : { code: '', name: '', hex: '#3366CC' },
      )
      setErrors({})
    }
  }, [open, color])

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Tên màu không được để trống' }); return }
    onSubmit({ ...form, code: form.code?.trim() || undefined })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-card border shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-lg">{color ? 'Cập nhật màu' : 'Thêm màu'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Mã màu (bỏ trống để tự sinh)">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VD: NVY" />
          </Field>
          <Field label="Tên màu *" error={errors.name}>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Navy" />
          </Field>
          <Field label="Mã hex">
            <div className="d-flex align-items-center gap-2">
              <input type="color" value={form.hex || '#3366CC'} onChange={(e) => setForm({ ...form, hex: e.target.value })} style={{ width: 44, height: 38, padding: 2, borderRadius: 8 }} />
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.hex ?? ''} onChange={(e) => setForm({ ...form, hex: e.target.value })} placeholder="#1F2A56" />
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : color ? 'Cập nhật' : 'Tạo mới'}
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
