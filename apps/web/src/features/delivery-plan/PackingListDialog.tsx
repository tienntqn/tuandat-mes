import { useMemo } from 'react'
import { X, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { deliveryApi, DELIVERY_STATUS_LABELS } from './delivery.api'

interface Props {
  open: boolean
  planId: number | null
  onClose: () => void
}

const cellKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`
const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

// Phiếu đóng gói: bảng màu × size của một lần giao hàng, in được (window.print)
export function PackingListDialog({ open, planId, onClose }: Props) {
  const { data: plan, isLoading } = useQuery({
    queryKey: ['delivery-plan', planId],
    queryFn: () => deliveryApi.get(planId!),
    enabled: open && !!planId,
  })

  const colors = useMemo(() => {
    const m = new Map<number, { id: number; name: string; hex: string | null }>()
    for (const it of plan?.items ?? []) if (it.color && !m.has(it.color.id)) m.set(it.color.id, it.color)
    return Array.from(m.values())
  }, [plan])
  const sizes = useMemo(() => {
    const m = new Map<number, { id: number; code: string; sortOrder: number }>()
    for (const it of plan?.items ?? []) if (it.size && !m.has(it.size.id)) m.set(it.size.id, it.size)
    return Array.from(m.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [plan])
  const qty = useMemo(() => {
    const o: Record<string, number> = {}
    for (const it of plan?.items ?? []) o[cellKey(it.colorId, it.sizeId)] = it.quantity
    return o
  }, [plan])
  const total = (plan?.items ?? []).reduce((s, it) => s + it.quantity, 0)
  const hasItems = colors.length > 0 && sizes.length > 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-card border shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10 no-print">
          <h2 className="font-bold text-lg">Phiếu đóng gói</h2>
          <div className="d-flex gap-2 align-items-center">
            <button onClick={() => window.print()} className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" disabled={!hasItems}>
              <Printer size={14} /> In / PDF
            </button>
            <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="p-5 packing-print">
          {isLoading ? (
            <p className="text-muted text-center py-4">Đang tải...</p>
          ) : !plan ? (
            <p className="text-muted text-center py-4">Không tìm thấy dữ liệu</p>
          ) : (
            <>
              <div className="text-center mb-3">
                <h3 className="fw-bold mb-1" style={{ fontSize: 18 }}>PHIẾU ĐÓNG GÓI / PACKING LIST</h3>
                <div className="text-muted small">Công ty Cổ phần Tuấn Đạt</div>
              </div>
              <div className="row g-2 mb-3" style={{ fontSize: 14 }}>
                <div className="col-6"><strong>PO:</strong> {plan.po?.poNumber ?? '—'}</div>
                <div className="col-6"><strong>Mã hàng:</strong> {plan.po?.style?.code ?? '—'} {plan.po?.style?.name ? `— ${plan.po.style.name}` : ''}</div>
                <div className="col-6"><strong>Ngày giao dự kiến:</strong> {fmtDate(plan.plannedDate)}</div>
                <div className="col-6"><strong>Ngày giao thực tế:</strong> {fmtDate(plan.actualDate)}</div>
                <div className="col-6"><strong>Trạng thái:</strong> {DELIVERY_STATUS_LABELS[plan.status] ?? plan.status}</div>
                <div className="col-6"><strong>Tổng thực giao:</strong> {total.toLocaleString('vi-VN')} SP</div>
              </div>

              {hasItems ? (
                <table className="table table-bordered text-center mb-0" style={{ fontSize: 14 }}>
                  <thead className="thead-light">
                    <tr>
                      <th className="text-start">Màu \ Size</th>
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
                            const v = qty[cellKey(c.id, s.id)] || 0
                            return <td key={s.id}>{v ? v.toLocaleString('vi-VN') : '—'}</td>
                          })}
                          <td className="fw-medium">{rowTotal.toLocaleString('vi-VN')}</td>
                        </tr>
                      )
                    })}
                    <tr className="thead-light">
                      <td className="text-start fw-semibold">Tổng theo size</td>
                      {sizes.map((s) => {
                        const colTotal = colors.reduce((sum, c) => sum + (qty[cellKey(c.id, s.id)] || 0), 0)
                        return <td key={s.id} className="fw-medium">{colTotal.toLocaleString('vi-VN')}</td>
                      })}
                      <td className="fw-bold">{total.toLocaleString('vi-VN')}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-muted text-center py-4">Lần giao này chưa có phiếu đóng gói theo Màu × Size.</p>
              )}

              <div className="row mt-5 text-center no-print" style={{ fontSize: 13 }}>
                <div className="col-6"><div className="text-muted">Người đóng gói</div></div>
                <div className="col-6"><div className="text-muted">Người nhận</div></div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .packing-print, .packing-print * { visibility: visible !important; }
          .packing-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
