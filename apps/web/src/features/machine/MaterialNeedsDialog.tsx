import { X, ShoppingCart } from 'lucide-react'
import { useMaterialNeeds } from './part-request.hooks'
import type { WorkPlan } from './maintenance-plan.api'
import type { PartRequestItemInput } from './part-request.api'

/**
 * Nhu cầu vật tư của một kế hoạch: cộng dồn định mức vật tư của các dòng công việc,
 * đối chiếu tồn kho xưởng để biết còn thiếu bao nhiêu cần mua.
 */
export function MaterialNeedsDialog({
  plan, onClose, onCreateRequest,
}: {
  plan: WorkPlan
  onClose: () => void
  onCreateRequest?: (items: PartRequestItemInput[]) => void
}) {
  const { data, isLoading } = useMaterialNeeds(plan.id)
  const rows = data?.rows ?? []
  const shortageRows = rows.filter((r) => r.shortage > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">Nhu cầu vật tư — {plan.planNo}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="p-5">
          <div className="alert alert-info small">
            Nhu cầu được tính từ <strong>định mức vật tư</strong> của các máy trong kế hoạch,
            đối chiếu với <strong>tồn kho xưởng</strong> hiện tại.
          </div>

          {isLoading ? (
            <div className="text-center py-4 text-muted">Đang tính toán...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Các máy trong kế hoạch chưa khai báo định mức vật tư nên chưa tính được nhu cầu.
            </div>
          ) : (
            <>
              <div className="table-responsive border rounded-lg mb-3">
                <table className="table table-sm mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: 90 }}>Mã</th><th>Vật tư</th>
                      <th style={{ width: 60 }}>ĐVT</th>
                      <th className="text-end" style={{ width: 80 }}>Cần</th>
                      <th className="text-end" style={{ width: 80 }}>Tồn</th>
                      <th className="text-end" style={{ width: 90 }}>Còn thiếu</th>
                      <th>Máy áp dụng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={r.shortage > 0 ? 'table-warning' : ''}>
                        <td className="small"><code>{r.code ?? '—'}</code></td>
                        <td className="small fw-medium">{r.name}</td>
                        <td className="small">{r.unit ?? '—'}</td>
                        <td className="text-end small">{r.required}</td>
                        <td className="text-end small">{r.inStock}</td>
                        <td className="text-end small fw-medium">
                          {r.shortage > 0 ? <span className="text-danger">{r.shortage}</span> : <span className="text-success">Đủ</span>}
                        </td>
                        <td className="small text-muted">{r.machines.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {shortageRows.length > 0 && onCreateRequest && (
                <div className="d-flex justify-content-between align-items-center">
                  <div className="small text-muted">
                    Có <strong>{shortageRows.length}</strong> loại vật tư còn thiếu.
                  </div>
                  <button
                    onClick={() =>
                      onCreateRequest(
                        shortageRows.map((r) => ({
                          sparePartId: r.sparePartId ?? undefined,
                          name: r.name,
                          unit: r.unit ?? undefined,
                          quantity: r.shortage,
                        })),
                      )
                    }
                    className="btn btn-primary text-white d-inline-flex align-items-center gap-1"
                  >
                    <ShoppingCart size={15} /> Lập yêu cầu mua vật tư thiếu
                  </button>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  )
}
