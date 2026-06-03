import { useDeliveryPlans } from '@/features/delivery-plan/delivery.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatusBadge } from '@/components/shared/StatusBadge'

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

function Bar({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-green-500' : 'bg-primary'
  return (
    <div className="d-flex align-items-center gap-2" style={{ minWidth: 140 }}>
      <div className="flex-grow-1" style={{ background: '#eee', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div className={color} style={{ width: `${Math.min(pct, 100)}%`, height: '100%' }} />
      </div>
      <small className="text-muted" style={{ width: 38 }}>{pct}%</small>
    </div>
  )
}

export default function ShippingProgressPage() {
  const { data, isLoading, refetch } = useDeliveryPlans({ pageSize: 200 })
  const plans = data?.data ?? []

  const totalPlanned = plans.reduce((s, p) => s + p.plannedQuantity, 0)
  const totalActual = plans.reduce((s, p) => s + (p.actualQuantity ?? 0), 0)
  const overallPct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

  return (
    <PageWrapper
      title="Tiến độ xuất hàng"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Theo dõi tiến độ' }, { label: 'Tiến độ xuất hàng' }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
          <span><i className="fe fe-rotate-ccw"></i></span>
        </button>
      }
    >
      <div className="row mb-3">
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">SL kế hoạch giao</small><span className="fw-bold">{totalPlanned.toLocaleString()}</span></div></div></div>
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">SL thực giao</small><span className="fw-bold">{totalActual.toLocaleString()}</span></div></div></div>
        <div className="col-auto"><div className="card"><div className="card-body py-2 px-3"><small className="text-muted d-block">Tiến độ giao hàng</small><span className="fw-bold">{overallPct}%</span></div></div></div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th>PO</th>
                  <th>Mã hàng</th>
                  <th>Ngày giao dự kiến</th>
                  <th className="text-end">SL dự kiến</th>
                  <th>Ngày giao thực tế</th>
                  <th className="text-end">SL thực giao</th>
                  <th style={{ width: 180 }}>Tiến độ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Chưa có kế hoạch giao hàng</td></tr>
                ) : (
                  plans.map((p) => {
                    const pct = p.plannedQuantity > 0 ? Math.round(((p.actualQuantity ?? 0) / p.plannedQuantity) * 100) : 0
                    return (
                      <tr key={p.id}>
                        <td><code>{p.po?.poNumber}</code></td>
                        <td className="text-muted">{p.po?.style?.code ?? '—'}</td>
                        <td>{formatDate(p.plannedDate)}</td>
                        <td className="text-end">{p.plannedQuantity.toLocaleString()}</td>
                        <td>{formatDate(p.actualDate)}</td>
                        <td className="text-end fw-medium">{p.actualQuantity != null ? p.actualQuantity.toLocaleString() : '—'}</td>
                        <td><Bar pct={pct} /></td>
                        <td><StatusBadge status={p.status} /></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
