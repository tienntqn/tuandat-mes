import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DELIVERY_STATUS_LABELS, deliveryApi, type DeliveryPlan, type CreateDeliveryPlanDto } from './delivery.api'
import { usePurchaseOrders } from '@/features/purchase-order/po.hooks'
import { poApi } from '@/features/purchase-order/po.api'

interface Props {
  open: boolean
  plan?: DeliveryPlan | null
  onClose: () => void
  onSubmit: (dto: CreateDeliveryPlanDto) => void
  isPending?: boolean
}

const today = () => new Date().toISOString().split('T')[0]
const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`

export function DeliveryPlanFormDialog({ open, plan, onClose, onSubmit, isPending }: Props) {
  const { data: poData } = usePurchaseOrders({ pageSize: 200 })
  const pos = poData?.data ?? []

  const [form, setForm] = useState<CreateDeliveryPlanDto>({ poId: 0, plannedDate: today(), plannedQuantity: 0, status: 'PENDING' })
  const [qty, setQty] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Chi tiết PO đang chọn → lấy ma trận màu×size (đã đặt) để dựng phiếu đóng gói
  const { data: poDetail } = useQuery({
    queryKey: ['po', form.poId],
    queryFn: () => poApi.get(form.poId),
    enabled: open && form.poId > 0,
  })
  // Khi sửa: lấy chi tiết kế hoạch giao để prefill phiếu đóng gói
  const { data: planDetail } = useQuery({
    queryKey: ['delivery-plan', plan?.id],
    queryFn: () => deliveryApi.get(plan!.id),
    enabled: open && !!plan,
  })

  // Tập màu & size lấy từ các ô đã phân bổ của PO
  const colors = useMemo(() => {
    const m = new Map<number, { id: number; code: string; name: string; hex: string | null }>()
    for (const it of poDetail?.items ?? []) if (it.color && !m.has(it.color.id)) m.set(it.color.id, it.color)
    return Array.from(m.values())
  }, [poDetail])
  const sizes = useMemo(() => {
    const m = new Map<number, { id: number; code: string; name: string; sortOrder: number }>()
    for (const it of poDetail?.items ?? []) if (it.size && !m.has(it.size.id)) m.set(it.size.id, it.size)
    return Array.from(m.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [poDetail])
  // SL đã đặt theo từng ô (tham chiếu)
  const ordered = useMemo(() => {
    const o: Record<string, number> = {}
    for (const it of poDetail?.items ?? []) o[cellKey(it.colorId, it.sizeId)] = it.quantity
    return o
  }, [poDetail])
  const hasMatrix = colors.length > 0 && sizes.length > 0

  // Reset khi mở/đổi plan — KHÔNG để `pos` trong deps (tránh mất ký tự đang gõ).
  useEffect(() => {
    if (open) {
      setForm(
        plan
          ? {
              poId: plan.poId,
              plannedDate: plan.plannedDate.split('T')[0],
              plannedQuantity: plan.plannedQuantity,
              actualDate: plan.actualDate ? plan.actualDate.split('T')[0] : '',
              actualQuantity: plan.actualQuantity ?? undefined,
              status: plan.status,
              note: plan.note ?? '',
            }
          : { poId: 0, plannedDate: today(), plannedQuantity: 0, status: 'PENDING' },
      )
      setQty({})
      setErrors({})
    }
  }, [open, plan])

  // Prefill phiếu đóng gói từ chi tiết kế hoạch khi sửa
  useEffect(() => {
    if (open && planDetail?.items) {
      const m: Record<string, number> = {}
      for (const it of planDetail.items) m[cellKey(it.colorId, it.sizeId)] = it.quantity
      setQty(m)
    }
  }, [open, planDetail])

  // Tự chọn PO đầu tiên khi tải xong (chỉ khi tạo mới & chưa chọn).
  useEffect(() => {
    if (open && !plan && pos.length > 0) {
      setForm((f) => (f.poId ? f : { ...f, poId: pos[0].id }))
    }
  }, [open, plan, pos])

  const matrixTotal = useMemo(() => {
    if (!hasMatrix) return 0
    let sum = 0
    for (const c of colors) for (const s of sizes) sum += qty[cellKey(c.id, s.id)] || 0
    return sum
  }, [qty, colors, sizes, hasMatrix])

  const actualTotal = hasMatrix ? matrixTotal : form.actualQuantity ?? 0

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.poId) e.poId = 'Vui lòng chọn PO'
    if (!form.plannedDate) e.plannedDate = 'Vui lòng chọn ngày giao dự kiến'
    if (!form.plannedQuantity || form.plannedQuantity < 1) e.plannedQuantity = 'Số lượng phải lớn hơn 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const items = hasMatrix
      ? colors.flatMap((c) => sizes.map((s) => ({ colorId: c.id, sizeId: s.id, quantity: qty[cellKey(c.id, s.id)] || 0 }))).filter((it) => it.quantity > 0)
      : undefined
    onSubmit({
      ...form,
      actualDate: form.actualDate || undefined,
      actualQuantity: hasMatrix ? matrixTotal : (form.actualQuantity ?? undefined),
      items,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">{plan ? 'Cập nhật kế hoạch giao hàng' : 'Tạo kế hoạch giao hàng'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="PO *" error={errors.poId}>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.poId} disabled={!!plan} onChange={(e) => { setForm({ ...form, poId: +e.target.value }); setQty({}) }}>
              <option value={0}>-- Chọn PO --</option>
              {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber} — {p.style?.code} ({p.totalQuantity.toLocaleString()} SP)</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày giao dự kiến *" error={errors.plannedDate}>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
            </Field>
            <Field label="SL dự kiến *" error={errors.plannedQuantity}>
              <input type="number" min={1} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plannedQuantity || ''} onChange={(e) => setForm({ ...form, plannedQuantity: +e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày giao thực tế">
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.actualDate ?? ''} onChange={(e) => setForm({ ...form, actualDate: e.target.value })} />
            </Field>
            <Field label="Trạng thái">
              <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>

          {/* Phiếu đóng gói: ma trận màu × size (SL thực giao) */}
          {form.poId > 0 && (
            hasMatrix ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Phiếu đóng gói — SL thực giao theo Màu × Size</label>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="table table-sm table-bordered mb-0 text-center" style={{ minWidth: 380 }}>
                    <thead className="thead-light">
                      <tr>
                        <th className="text-start" style={{ minWidth: 110 }}>Màu \ Size</th>
                        {sizes.map((s) => <th key={s.id}>{s.code}</th>)}
                        <th>Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colors.map((c) => {
                        const rowTotal = sizes.reduce((sum, s) => sum + (qty[cellKey(c.id, s.id)] || 0), 0)
                        return (
                          <tr key={c.id}>
                            <td className="text-start">
                              <span className="d-inline-flex align-items-center gap-1">
                                <span style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid #ccc', background: c.hex ?? '#fff', display: 'inline-block' }} />
                                {c.name}
                              </span>
                            </td>
                            {sizes.map((s) => {
                              const ord = ordered[cellKey(c.id, s.id)] || 0
                              return (
                                <td key={s.id} style={{ padding: 2 }}>
                                  <input
                                    type="number"
                                    min={0}
                                    title={ord ? `Đã đặt: ${ord}` : undefined}
                                    placeholder={ord ? String(ord) : ''}
                                    className="form-control form-control-sm text-center"
                                    style={{ width: 64, margin: '0 auto' }}
                                    value={qty[cellKey(c.id, s.id)] ?? ''}
                                    onChange={(e) => {
                                      const v = e.target.value === '' ? 0 : Math.max(0, +e.target.value)
                                      setQty((q) => ({ ...q, [cellKey(c.id, s.id)]: v }))
                                    }}
                                  />
                                </td>
                              )
                            })}
                            <td className="fw-medium align-middle">{rowTotal.toLocaleString()}</td>
                          </tr>
                        )
                      })}
                      <tr className="thead-light">
                        <td className="text-start fw-semibold">Tổng theo size</td>
                        {sizes.map((s) => {
                          const colTotal = colors.reduce((sum, c) => sum + (qty[cellKey(c.id, s.id)] || 0), 0)
                          return <td key={s.id} className="fw-medium">{colTotal.toLocaleString()}</td>
                        })}
                        <td className="fw-bold text-primary">{actualTotal.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Placeholder hiển thị SL đã đặt theo PO. Bỏ trống các ô chưa giao.</p>
              </div>
            ) : (
              <Field label="SL thực giao">
                <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.actualQuantity ?? ''} onChange={(e) => setForm({ ...form, actualQuantity: e.target.value === '' ? undefined : +e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">PO chưa khai báo Màu/Size — nhập tổng SL thực giao.</p>
              </Field>
            )
          )}

          <Field label="Ghi chú">
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {isPending ? 'Đang lưu...' : plan ? 'Cập nhật' : 'Tạo mới'}
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
