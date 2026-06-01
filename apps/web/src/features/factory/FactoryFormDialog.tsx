import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Factory, CreateFactoryDto } from './factory.api'

interface Props {
  open: boolean
  factory?: Factory | null
  onClose: () => void
  onSubmit: (dto: CreateFactoryDto) => void
  isPending?: boolean
}

const EMPTY: CreateFactoryDto = { code: '', name: '', address: '', phone: '', status: 'ACTIVE' }

export function FactoryFormDialog({ open, factory, onClose, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CreateFactoryDto>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateFactoryDto, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(factory ? { code: factory.code, name: factory.name, address: factory.address ?? '', phone: factory.phone ?? '', status: factory.status } : EMPTY)
      setErrors({})
    }
  }, [open, factory])

  const validate = () => {
    const e: typeof errors = {}
    if (!form.code.trim()) e.code = 'Mã xưởng không được để trống'
    if (!form.name.trim()) e.name = 'Tên xưởng không được để trống'
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
          <h2 className="font-bold text-lg">{factory ? 'Cập nhật xưởng' : 'Thêm xưởng mới'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <FormField label="Mã xưởng *" error={errors.code}>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="VD: XUONG-1"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              disabled={!!factory}
            />
          </FormField>
          <FormField label="Tên xưởng *" error={errors.name}>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="VD: Xưởng 1 - Hà Nội"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Số điện thoại">
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Địa chỉ">
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FormField>
          <FormField label="Trạng thái">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Đang lưu...' : factory ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
