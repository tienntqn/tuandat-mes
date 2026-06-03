import { useMemo } from 'react'
import { useCompanyPlans } from './plan.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { CompanyPlan } from './plan.api'

interface PoGroup {
  poId: number
  poNumber: string
  styleCode: string
  styleName: string
  totalQuantity: number
  allocated: number
  plans: CompanyPlan[]
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export default function PlanByPoPage() {
  const { data, isLoading, refetch } = useCompanyPlans({ pageSize: 200 })

  const groups = useMemo<PoGroup[]>(() => {
    const plans = data?.data ?? []
    const map = new Map<number, PoGroup>()
    for (const p of plans) {
      if (!p.po) continue
      if (!map.has(p.poId)) {
        map.set(p.poId, {
          poId: p.poId,
          poNumber: p.po.poNumber,
          styleCode: p.style?.code ?? '',
          styleName: p.style?.name ?? '',
          totalQuantity: p.po.totalQuantity,
          allocated: 0,
          plans: [],
        })
      }
      const g = map.get(p.poId)!
      g.allocated += p.plannedQuantity
      g.plans.push(p)
    }
    return Array.from(map.values())
  }, [data])

  return (
    <PageWrapper
      title="Kế hoạch theo PO"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Kế hoạch sản xuất' }, { label: 'Kế hoạch theo PO' }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
          <span><i className="fe fe-rotate-ccw"></i></span>
        </button>
      }
    >
      {isLoading ? (
        <div className="text-center py-5 text-muted">Đang tải...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-5 text-muted">Chưa có kế hoạch nào được phân bổ theo PO</div>
      ) : (
        groups.map((g) => {
          const remaining = g.totalQuantity - g.allocated
          const pct = g.totalQuantity > 0 ? Math.round((g.allocated / g.totalQuantity) * 100) : 0
          return (
            <div className="card mb-3" key={g.poId}>
              <div className="card-header d-flex flex-wrap align-items-center gap-3">
                <div>
                  <code className="text-primary">{g.poNumber}</code>
                  <span className="ms-2 text-muted">{g.styleCode} — {g.styleName}</span>
                </div>
                <div className="ms-auto d-flex gap-3 small">
                  <span>Tổng PO: <b>{g.totalQuantity.toLocaleString()}</b></span>
                  <span>Đã phân bổ: <b>{g.allocated.toLocaleString()}</b> ({pct}%)</span>
                  <span className={remaining < 0 ? 'text-danger' : ''}>Còn lại: <b>{remaining.toLocaleString()}</b></span>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-vcenter mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th>Xưởng</th>
                        <th className="text-end">SL phân bổ</th>
                        <th className="text-end">Đã chia chuyền</th>
                        <th>Bắt đầu</th>
                        <th>Dự kiến xong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.plans.map((p) => (
                        <tr key={p.id}>
                          <td>{p.factory ? `${p.factory.code} — ${p.factory.name}` : '—'}</td>
                          <td className="text-end fw-medium">{p.plannedQuantity.toLocaleString()}</td>
                          <td className="text-end text-muted">{(p.allocatedToLines ?? 0).toLocaleString()}</td>
                          <td>{formatDate(p.startDate)}</td>
                          <td>{formatDate(p.expectedFinishDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })
      )}
    </PageWrapper>
  )
}
