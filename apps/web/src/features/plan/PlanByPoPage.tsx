import { useMemo, useState } from 'react'
import { useCompanyPlans } from './plan.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { CompanyPlan } from './plan.api'

interface PoGroup {
  poId: number
  poNumber: string
  styleCode: string
  styleName: string
  deliveryDate?: string
  totalQuantity: number
  allocated: number
  plans: CompanyPlan[]
}

type StatusFilter = '' | 'complete' | 'under' | 'over'

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')
const nf = (n: number) => n.toLocaleString('vi-VN')

// Trạng thái phân bổ của 1 PO
function allocStatus(total: number, allocated: number): { key: StatusFilter; label: string; cls: string; bar: string } {
  if (allocated > total) return { key: 'over', label: 'Vượt chỉ tiêu', cls: 'bg-danger-transparent text-danger', bar: 'bg-danger' }
  if (allocated >= total && total > 0) return { key: 'complete', label: 'Đã phân đủ', cls: 'bg-success-transparent text-success', bar: 'bg-success' }
  return { key: 'under', label: 'Chưa phân đủ', cls: 'bg-warning-transparent text-warning', bar: 'bg-warning' }
}

export default function PlanByPoPage() {
  const { data, isLoading, refetch } = useCompanyPlans({ pageSize: 200 })

  const [search, setSearch] = useState('')
  const [factoryFilter, setFactoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  const plans = data?.data ?? []

  // Danh sách xưởng để lọc
  const factoryOptions = useMemo(() => {
    const map = new Map<number, string>()
    plans.forEach((p) => p.factory && map.set(p.factory.id, `${p.factory.code} — ${p.factory.name}`))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [plans])

  // Gom theo PO (lọc theo xưởng nếu có)
  const groups = useMemo<PoGroup[]>(() => {
    const map = new Map<number, PoGroup>()
    for (const p of plans) {
      if (!p.po) continue
      if (factoryFilter && String(p.factoryId) !== factoryFilter) continue
      if (!map.has(p.poId)) {
        map.set(p.poId, {
          poId: p.poId,
          poNumber: p.po.poNumber,
          styleCode: p.style?.code ?? '',
          styleName: p.style?.name ?? '',
          deliveryDate: p.po.deliveryDate,
          totalQuantity: p.po.totalQuantity,
          allocated: 0,
          plans: [],
        })
      }
      const g = map.get(p.poId)!
      g.allocated += p.plannedQuantity
      g.plans.push(p)
    }
    return Array.from(map.values()).sort((a, b) => a.poNumber.localeCompare(b.poNumber))
  }, [plans, factoryFilter])

  // Lọc theo tìm kiếm + trạng thái
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return groups.filter((g) => {
      if (kw && !`${g.poNumber} ${g.styleCode} ${g.styleName}`.toLowerCase().includes(kw)) return false
      if (statusFilter && allocStatus(g.totalQuantity, g.allocated).key !== statusFilter) return false
      return true
    })
  }, [groups, search, statusFilter])

  // KPI tổng quan (theo dữ liệu đã lọc)
  const kpi = useMemo(() => {
    const totalPlanned = filtered.reduce((s, g) => s + g.totalQuantity, 0)
    const totalAllocated = filtered.reduce((s, g) => s + g.allocated, 0)
    const pct = totalPlanned > 0 ? Math.round((totalAllocated / totalPlanned) * 100) : 0
    const underCount = filtered.filter((g) => g.allocated < g.totalQuantity).length
    return { poCount: filtered.length, totalPlanned, totalAllocated, pct, underCount }
  }, [filtered])

  const hasFilter = !!(search || factoryFilter || statusFilter)

  return (
    <PageWrapper
      title="Kế hoạch theo PO"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Kế hoạch sản xuất' }, { label: 'Kế hoạch theo PO' }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon" title="Tải lại">
          <span><i className="fe fe-rotate-ccw"></i></span>
        </button>
      }
    >
      {/* KPI tổng quan */}
      <div className="row g-3 mb-1">
        <KpiCard icon="fe-shopping-cart" color="#6259ca" label="Số PO" value={nf(kpi.poCount)} />
        <KpiCard icon="fe-layers" color="#2d9cdb" label="Tổng SL kế hoạch" value={nf(kpi.totalPlanned)} />
        <KpiCard icon="fe-check-circle" color="#27ae60" label="Đã phân bổ" value={`${nf(kpi.totalAllocated)} (${kpi.pct}%)`} />
        <KpiCard icon="fe-alert-triangle" color="#eb5757" label="PO chưa phân đủ" value={nf(kpi.underCount)} />
      </div>

      {/* Bộ lọc */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="fe fe-search text-muted"></i></span>
                <input
                  className="form-control"
                  placeholder="Tìm theo số PO, mã hàng, tên hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-auto">
              <select className="form-select" value={factoryFilter} onChange={(e) => setFactoryFilter(e.target.value)}>
                <option value="">Tất cả xưởng</option>
                {factoryOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-auto">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="">Mọi trạng thái</option>
                <option value="complete">Đã phân đủ</option>
                <option value="under">Chưa phân đủ</option>
                <option value="over">Vượt chỉ tiêu</option>
              </select>
            </div>
            {hasFilter && (
              <div className="col-auto">
                <button className="btn btn-link text-muted text-decoration-none px-1"
                  onClick={() => { setSearch(''); setFactoryFilter(''); setStatusFilter('') }}>
                  <i className="fe fe-x me-1"></i>Xóa lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách PO */}
      {isLoading ? (
        <div className="card"><div className="card-body text-center py-5 text-muted">Đang tải...</div></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="card-body text-center py-5 text-muted">
          <i className="fe fe-inbox d-block mb-2" style={{ fontSize: 36, opacity: 0.3 }}></i>
          {hasFilter ? 'Không có PO khớp bộ lọc' : 'Chưa có kế hoạch nào được phân bổ theo PO'}
        </div></div>
      ) : (
        filtered.map((g) => {
          const remaining = g.totalQuantity - g.allocated
          const pct = g.totalQuantity > 0 ? Math.round((g.allocated / g.totalQuantity) * 100) : 0
          const st = allocStatus(g.totalQuantity, g.allocated)
          return (
            <div className="card mb-3 shadow-sm border-0" key={g.poId}>
              {/* Header */}
              <div className="card-header bg-white border-bottom">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="badge bg-primary-transparent text-primary px-2 py-1" style={{ fontSize: 13 }}>
                    <i className="fe fe-shopping-cart me-1"></i>{g.poNumber}
                  </span>
                  <span className="fw-semibold">{g.styleCode}</span>
                  <span className="text-muted">— {g.styleName}</span>
                  <span className={`badge ms-1 ${st.cls}`}>{st.label}</span>
                  {g.deliveryDate && (
                    <span className="ms-auto text-muted small"><i className="fe fe-truck me-1"></i>Giao: {formatDate(g.deliveryDate)}</span>
                  )}
                </div>
                {/* Thanh tiến độ phân bổ */}
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <div className="progress flex-grow-1" style={{ height: 8, minWidth: 180 }}>
                    <div className={`progress-bar ${st.bar}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                  </div>
                  <div className="d-flex gap-3 small text-nowrap">
                    <span className="text-muted">Tổng PO: <b className="text-dark">{nf(g.totalQuantity)}</b></span>
                    <span className="text-muted">Đã phân: <b className="text-dark">{nf(g.allocated)}</b> ({pct}%)</span>
                    <span className={remaining < 0 ? 'text-danger' : remaining === 0 ? 'text-success' : 'text-warning'}>
                      Còn lại: <b>{nf(remaining)}</b>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng phân bổ theo xưởng */}
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th>Xưởng</th>
                        <th className="text-end" style={{ width: 130 }}>SL phân bổ</th>
                        <th style={{ width: 220 }}>Đã chia chuyền</th>
                        <th style={{ width: 120 }}>Bắt đầu</th>
                        <th style={{ width: 120 }}>Dự kiến xong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.plans.map((p) => {
                        const toLines = p.allocatedToLines ?? 0
                        const linePct = p.plannedQuantity > 0 ? Math.round((toLines / p.plannedQuantity) * 100) : 0
                        return (
                          <tr key={p.id}>
                            <td className="fw-medium">{p.factory ? `${p.factory.code} — ${p.factory.name}` : '—'}</td>
                            <td className="text-end fw-semibold">{nf(p.plannedQuantity)}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress flex-grow-1" style={{ height: 6 }}>
                                  <div className={`progress-bar ${linePct >= 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${Math.min(100, linePct)}%` }}></div>
                                </div>
                                <small className="text-muted text-nowrap" style={{ width: 78 }}>{nf(toLines)} ({linePct}%)</small>
                              </div>
                            </td>
                            <td className="text-muted">{formatDate(p.startDate)}</td>
                            <td className="text-muted">{formatDate(p.expectedFinishDate)}</td>
                          </tr>
                        )
                      })}
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

function KpiCard({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card mb-0 shadow-sm border-0 h-100">
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded"
            style={{ width: 44, height: 44, background: `${color}1a`, color, flexShrink: 0 }}>
            <i className={`fe ${icon}`} style={{ fontSize: 20 }}></i>
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="text-muted small">{label}</div>
            <div className="fw-bold fs-5 text-truncate">{value}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
