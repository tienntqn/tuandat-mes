import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Machine, CreateMachineDto, MachineType, MachineStatus } from './machine.api'
import { MACHINE_TYPE_LABELS, MACHINE_STATUS_LABELS } from './machine.api'

interface Props {
  open: boolean
  machine?: Machine | null
  factories: { id: number; name: string; code: string }[]
  lines: { id: number; name: string; lineNumber: number; factoryId: number }[]
  onClose: () => void
  onSubmit: (dto: CreateMachineDto) => void
  isPending?: boolean
}

const EMPTY: CreateMachineDto = {
  name: '',
  type: 'SEWING',
  factoryId: 0,
  lineId: null,
  status: 'IDLE',
  brand: '',
  model: '',
  purchaseDate: '',
  note: '',
}

export function MachineFormDialog({ open, machine, factories, lines, onClose, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CreateMachineDto>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateMachineDto, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(
        machine
          ? {
              name: machine.name,
              type: machine.type,
              factoryId: machine.factoryId,
              lineId: machine.lineId,
              status: machine.status,
              brand: machine.brand ?? '',
              model: machine.model ?? '',
              purchaseDate: machine.purchaseDate ? machine.purchaseDate.substring(0, 10) : '',
              note: machine.note ?? '',
            }
          : EMPTY,
      )
      setErrors({})
    }
  }, [open, machine])

  const filteredLines = lines.filter((l) => l.factoryId === form.factoryId)

  const validate = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Tên máy không được để trống'
    if (!form.factoryId) e.factoryId = 'Vui lòng chọn xưởng'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) {
      onSubmit({
        ...form,
        lineId: form.lineId || null,
        brand: form.brand || undefined,
        model: form.model || undefined,
        purchaseDate: form.purchaseDate || undefined,
        note: form.note || undefined,
      })
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-card border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card">
          <h2 className="font-bold text-lg">{machine ? 'Cập nhật máy' : 'Thêm máy mới'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {machine && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Mã máy: </span>
              <code className="font-semibold">{machine.code}</code>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tên máy *" error={errors.name}>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="VD: Máy may Juki"
                value={form.name}
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Loại máy *">
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as MachineType })}
              >
                {(Object.entries(MACHINE_TYPE_LABELS) as [MachineType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Xưởng *" error={errors.factoryId as string}>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.factoryId || ''}
              onChange={(e) => setForm({ ...form, factoryId: Number(e.target.value), lineId: null })}
            >
              <option value="">— Chọn xưởng —</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
              ))}
            </select>
          </FormField>

          <FormField label="Chuyền (tùy chọn)">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.lineId ?? ''}
              onChange={(e) => setForm({ ...form, lineId: e.target.value ? Number(e.target.value) : null })}
              disabled={!form.factoryId}
            >
              <option value="">— Chưa gán chuyền —</option>
              {filteredLines.map((l) => (
                <option key={l.id} value={l.id}>Chuyền {l.lineNumber} — {l.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Trạng thái">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as MachineStatus })}
            >
              {(Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Hãng sản xuất">
              <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="VD: Juki" value={form.brand ?? ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </FormField>
            <FormField label="Model">
              <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="VD: DDL-8700" value={form.model ?? ''} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </FormField>
          </div>

          <FormField label="Ngày mua">
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.purchaseDate ?? ''} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </FormField>

          <FormField label="Ghi chú">
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Đang lưu...' : machine ? 'Cập nhật' : 'Tạo mới'}
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
