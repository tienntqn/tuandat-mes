import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { PurchaseOrder, CreatePODto } from './po.api'
import { PO_STATUS_LABELS, poApi } from './po.api'
import { useStylesActive } from '@/features/style/style.hooks'
import { useOrdersActive } from '@/features/order/order.hooks'
import { styleApi } from '@/features/style/style.api'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  open: boolean
  po?: PurchaseOrder | null
  onClose: () => void
  onSubmit: (dto: CreatePODto) => void
  isPending?: boolean
}

const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`

export function POFormDialog({ open, po, onClose, onSubmit, isPending }: Props) {
  const { data: styles = [] } = useStylesActive()
  const { data: orders = [] } = useOrdersActive()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const hasRole = useAuthStore((s) => s.hasRole)
  // Chỉ BOD/ADMIN được nhập trợ giá
  const canEditSubsidy = isAdmin() || hasRole('BOD')
  const [form, setForm] = useState<CreatePODto>({ poNumber: '', styleId: 0, orderId: null, totalQuantity: 0, deliveryDate: '', unitPrice: null, subsidyPrice: null, status: 'OPEN' })
  const [qty, setQty] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Chi tiết mã hàng đang chọn → lấy danh sách màu & size để dựng ma trận
  const { data: styleDetail } = useQuery({
    queryKey: ['style', form.styleId],
    queryFn: () => styleApi.get(form.styleId),
    enabled: open && form.styleId > 0,
  })
  // Khi sửa: lấy chi tiết PO để prefill ma trận
  const { data: poDetail } = useQuery({
    queryKey: ['po', po?.id],
    queryFn: () => poApi.get(po!.id),
    enabled: open && !!po,
  })

  const colors = useMemo(
    () => (styleDetail?.styleColors ?? []).map((sc) => sc.color).filter(Boolean) as { id: number; code: string; name: string; hex: string | null }[],
    [styleDetail],
  )
  const sizes = useMemo(
    () =>
      ((styleDetail?.styleSizes ?? []).map((ss) => ss.size).filter(Boolean) as { id: number; code: string; name: string; sortOrder: number }[]).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [styleDetail],
  )
  const hasMatrix = colors.length > 0 && sizes.length > 0

  // Reset form khi mở/đổi PO (không phụ thuộc styles)
  useEffect(() => {
    if (open) {
      setForm(
        po
          ? { poNumber: po.poNumber, styleId: po.styleId, orderId: po.orderId, totalQuantity: po.totalQuantity, deliveryDate: po.deliveryDate.split('T')[0], unitPrice: po.unitPrice, subsidyPrice: po.subsidyPrice, status: po.status }
          : { poNumber: '', styleId: 0, orderId: null, totalQuantity: 0, deliveryDate: '', unitPrice: null, subsidyPrice: null, status: 'OPEN' },
      )
      setQty({})
      setErrors({})
    }
  }, [open, po])

  // Prefill ma trận từ chi tiết PO khi sửa
  useEffect(() => {
    if (open && poDetail?.items) {
      const m: Record<string, number> = {}
      for (const it of poDetail.items) m[cellKey(it.colorId, it.sizeId)] = it.quantity
      setQty(m)
    }
  }, [open, poDetail])

  // Tự chọn mã hàng đầu tiên khi tạo mới
  useEffect(() => {
    if (open && !po && styles.length > 0) {
      setForm((f) => (f.styleId ? f : { ...f, styleId: styles[0].id }))
    }
  }, [open, po, styles])

  const matrixTotal = useMemo(() => {
    if (!hasMatrix) return 0
    let sum = 0
    for (const c of colors) for (const s of sizes) sum += qty[cellKey(c.id, s.id)] || 0
    return sum
  }, [qty, colors, sizes, hasMatrix])

  const total = hasMatrix ? matrixTotal : form.totalQuantity

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.poNumber.trim()) e.poNumber = 'Số PO không được để trống'
    if (!form.styleId) e.styleId = 'Vui lòng chọn mã hàng'
    if (!total || total < 1) e.totalQuantity = 'Tổng số lượng phải lớn hơn 0'
    if (!form.deliveryDate) e.deliveryDate = 'Vui lòng chọn ngày giao hàng'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const items = hasMatrix
      ? colors.flatMap((c) => sizes.map((s) => ({ colorId: c.id, sizeId: s.id, quantity: qty[cellKey(c.id, s.id)] || 0 }))).filter((it) => it.quantity > 0)
      : undefined
    onSubmit({ ...form, totalQuantity: total, items })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">{po ? 'Cập nhật PO' : 'Tạo Purchase Order'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số PO *" error={errors.poNumber}>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.poNumber} disabled={!!po} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
            </Field>
            <Field label="Ngày giao hàng *" error={errors.deliveryDate}>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Mã hàng *" error={errors.styleId}>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.styleId} disabled={!!po} onChange={(e) => { setForm({ ...form, styleId: +e.target.value }); setQty({}) }}>
              <option value={0}>-- Chọn mã hàng --</option>
              {styles.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.customer?.name})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn đặt hàng (tùy chọn)">
              <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.orderId ?? 0} onChange={(e) => setForm({ ...form, orderId: +e.target.value || null })}>
                <option value={0}>-- Không gắn đơn hàng --</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select className="w-full rounded-lg border px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(PO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>

          {/* Đơn giá gia công — dùng để tính lương công nhân */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn giá / SP (VNĐ)">
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.unitPrice ?? ''} onChange={(e) => setForm({ ...form, unitPrice: e.target.value === '' ? null : Math.max(0, +e.target.value) })} />
            </Field>
            <Field label="Trợ giá BOD (VNĐ)">
              <input type="number" min={0} className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-muted disabled:opacity-60" value={form.subsidyPrice ?? ''} disabled={!canEditSubsidy} onChange={(e) => setForm({ ...form, subsidyPrice: e.target.value === '' ? null : Math.max(0, +e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">{canEditSubsidy ? 'Có trợ giá thì dùng trợ giá để tính lương thay đơn giá.' : 'Chỉ Ban Giám đốc được nhập trợ giá.'}</p>
            </Field>
          </div>

          {/* Ma trận màu × size */}
          {form.styleId > 0 && (
            hasMatrix ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Phân bổ số lượng theo Màu × Size</label>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="table table-sm table-bordered mb-0 text-center" style={{ minWidth: 380 }}>
                    <thead className="thead-light">
                      <tr>
                        <th className="text-start" style={{ minWidth: 110 }}>Màu \\ Size</th>
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
                            {sizes.map((s) => (
                              <td key={s.id} style={{ padding: 2 }}>
                                <input
                                  type="number"
                                  min={0}
                                  className="form-control form-control-sm text-center"
                                  style={{ width: 64, margin: '0 auto' }}
                                  value={qty[cellKey(c.id, s.id)] ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value === '' ? 0 : Math.max(0, +e.target.value)
                                    setQty((q) => ({ ...q, [cellKey(c.id, s.id)]: v }))
                                  }}
                                />
                              </td>
                            ))}
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
                        <td className="fw-bold text-primary">{total.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {errors.totalQuantity && <p className="text-xs text-destructive mt-1">{errors.totalQuantity}</p>}
              </div>
            ) : (
              <Field label="Số lượng *" error={errors.totalQuantity}>
                <input type="number" min={1} className="w-full rounded-lg border px-3 py-2 text-sm" value={form.totalQuantity || ''} onChange={(e) => setForm({ ...form, totalQuantity: +e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Mã hàng chưa khai báo Màu/Size — vào Danh mục → Mã hàng để thêm, hoặc nhập tổng số lượng.</p>
              </Field>
            )
          )}

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
