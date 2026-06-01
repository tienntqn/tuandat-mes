import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Employee, CreateEmployeeDto } from './employee.api'
import { POSITION_LABELS } from './employee.api'
import { useFactories } from '@/features/factory/factory.hooks'
import { useLinesByFactory } from '@/features/production-line/line.hooks'

const FACTORY_POSITIONS = ['FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'MECHANIC']
const LINE_POSITIONS = ['LINE_LEADER', 'LINE_DEPUTY']
const COMPANY_POSITIONS = ['ADMIN', 'BOD', 'COMPANY_PLANNER']

interface Props {
  open: boolean
  employee?: Employee | null
  onClose: () => void
  onSubmit: (dto: CreateEmployeeDto) => void
  isPending?: boolean
}

export function EmployeeFormDialog({ open, employee, onClose, onSubmit, isPending }: Props) {
  const { data: factoriesData } = useFactories({ status: 'ACTIVE', pageSize: 200 })
  const factories = factoriesData?.data ?? []

  const [form, setForm] = useState<CreateEmployeeDto>({
    code: '',
    fullName: '',
    phone: '',
    email: '',
    position: 'FACTORY_PLANNER',
    factoryId: undefined,
    lineId: undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: linesData } = useLinesByFactory(
    FACTORY_POSITIONS.includes(form.position) || LINE_POSITIONS.includes(form.position)
      ? form.factoryId
      : undefined,
  )
  const lines = linesData ?? []

  useEffect(() => {
    if (open) {
      setForm(
        employee
          ? {
              code: employee.code,
              fullName: employee.fullName,
              phone: employee.phone ?? '',
              email: employee.email ?? '',
              position: employee.position,
              factoryId: employee.factoryId ?? undefined,
              lineId: employee.lineId ?? undefined,
            }
          : { code: '', fullName: '', phone: '', email: '', position: 'FACTORY_PLANNER', factoryId: undefined, lineId: undefined },
      )
      setErrors({})
    }
  }, [open, employee])

  // Reset lineId khi đổi factoryId
  const handlePositionChange = (pos: string) => {
    setForm((f) => ({ ...f, position: pos, factoryId: undefined, lineId: undefined }))
  }
  const handleFactoryChange = (fid: number | undefined) => {
    setForm((f) => ({ ...f, factoryId: fid, lineId: undefined }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.code.trim()) e.code = 'Mã nhân viên không được để trống'
    if (!form.fullName.trim()) e.fullName = 'Họ tên không được để trống'
    if (!form.position) e.position = 'Vui lòng chọn chức vụ'
    if (FACTORY_POSITIONS.includes(form.position) && !form.factoryId) e.factoryId = 'Vui lòng chọn xưởng'
    if (LINE_POSITIONS.includes(form.position) && !form.lineId) e.lineId = 'Vui lòng chọn chuyền'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) onSubmit(form)
  }

  if (!open) return null

  const needsFactory = FACTORY_POSITIONS.includes(form.position) || LINE_POSITIONS.includes(form.position)
  const needsLine = LINE_POSITIONS.includes(form.position)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card">
          <h2 className="font-bold text-lg">{employee ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <FormField label="Mã nhân viên *" error={errors.code}>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.code}
              disabled={!!employee}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </FormField>
          <FormField label="Họ và tên *" error={errors.fullName}>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </FormField>
          <FormField label="Số điện thoại">
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Chức vụ *" error={errors.position}>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.position}
              onChange={(e) => handlePositionChange(e.target.value)}
            >
              {Object.entries(POSITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>
          {needsFactory && (
            <FormField label="Xưởng *" error={errors.factoryId}>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.factoryId ?? ''}
                onChange={(e) => handleFactoryChange(e.target.value ? +e.target.value : undefined)}
              >
                <option value="">-- Chọn xưởng --</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
              </select>
            </FormField>
          )}
          {needsLine && form.factoryId && (
            <FormField label="Chuyền *" error={errors.lineId}>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.lineId ?? ''}
                onChange={(e) => setForm({ ...form, lineId: e.target.value ? +e.target.value : undefined })}
              >
                <option value="">-- Chọn chuyền --</option>
                {lines.map((l) => <option key={l.id} value={l.id}>Chuyền {l.lineNumber} — {l.name}</option>)}
              </select>
            </FormField>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : employee ? 'Cập nhật' : 'Tạo mới'}
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
