import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ProductionLine, CreateLineDto } from './line.api'
import type { Factory } from '@/features/factory/factory.api'
import { useFactories } from '@/features/factory/factory.hooks'

interface Props {
  open: boolean
  line?: ProductionLine | null
  defaultFactoryId?: number
  factories?: Factory[]  // optional: từ parent (cache sẵn, dùng ngay)
  onClose: () => void
  onSubmit: (dto: CreateLineDto) => void
  isPending?: boolean
}

export function LineFormDialog({ open, line, defaultFactoryId, factories: factoriesProp, onClose, onSubmit, isPending }: Props) {
  // Luôn fetch để có data mới nhất; nếu prop đã có thì dùng prop ngay (không đợi fetch)
  const { data: fetchedData, isLoading: fetchLoading } = useFactories({ pageSize: 200 })
  const fetchedFactories = (fetchedData?.data ?? []).filter((f) => f.status === 'ACTIVE' && !f.deletedAt)

  // Ưu tiên prop từ parent (đã load sẵn), lọc ACTIVE; fallback sang fetchedFactories
  const hasProp = factoriesProp != null && factoriesProp.length > 0
  const factories = hasProp
    ? factoriesProp.filter((f) => f.status === 'ACTIVE' && !f.deletedAt)
    : fetchedFactories
  // Chỉ hiển thị loading khi không có prop VÀ đang fetch
  const factoriesLoading = !hasProp && fetchLoading

  const [form, setForm] = useState<CreateLineDto>({
    factoryId: defaultFactoryId ?? 0,
    name: '',
    capacity: 0,
    status: 'ACTIVE',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(
        line
          ? { factoryId: line.factoryId, name: line.name, capacity: line.capacity, status: line.status }
          : { factoryId: defaultFactoryId ?? factories[0]?.id ?? 0, name: '', capacity: 0, status: 'ACTIVE' },
      )
      setErrors({})
    }
  }, [open, line, defaultFactoryId, factories])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.factoryId) e.factoryId = 'Vui lòng chọn xưởng'
    if (!form.name.trim()) e.name = 'Tên chuyền không được để trống'
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
          <h2 className="font-bold text-lg">{line ? 'Cập nhật chuyền' : 'Thêm chuyền mới'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {line && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Số chuyền: </span>
              <code className="font-semibold">Chuyền {line.lineNumber}</code>
            </div>
          )}
          <FormField label="Xưởng *" error={errors.factoryId}>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.factoryId}
              onChange={(e) => setForm({ ...form, factoryId: +e.target.value })}
              disabled={!!line || factoriesLoading}
            >
              {factoriesLoading ? (
                <option value={0}>Đang tải xưởng...</option>
              ) : factories.length === 0 ? (
                <option value={0}>Không có xưởng nào</option>
              ) : (
                <>
                  <option value={0}>-- Chọn xưởng --</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>{f.code} — {f.name}</option>
                  ))}
                </>
              )}
            </select>
          </FormField>
          <FormField label="Tên chuyền *" error={errors.name}>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="VD: Chuyền May 1"
              value={form.name}
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Năng lực (SP/ngày)">
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.capacity ?? 0}
              onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
            />
          </FormField>
          <FormField label="Trạng thái">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Đang lưu...' : line ? 'Cập nhật' : 'Tạo mới'}
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
