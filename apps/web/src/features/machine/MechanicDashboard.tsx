import { Link } from 'react-router-dom'
import { useMachines, useMaintenanceDue, useTransfers } from './machine.hooks'
import { useRepairProposals } from './repair.hooks'
import { useMechanicAlerts } from './machine-profile.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MACHINE_STATUS_LABELS, type MachineStatus } from './machine.api'
import { SEVERITY_LABELS, type BreakdownSeverity } from './breakdown.api'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

function KpiCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card mb-3">
        <div className="card-body d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center justify-content-center" style={{ width: 44, height: 44, borderRadius: 10, background: `${color}1a`, color }}>
            <i className={`fe ${icon}`} style={{ fontSize: 20 }}></i>
          </span>
          <div>
            <div className="fw-bold" style={{ fontSize: 22, lineHeight: 1 }}>{value}</div>
            <div className="text-muted small">{label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MechanicDashboard() {
  const { data: machinesData } = useMachines({ pageSize: 500 })
  const { data: dueMachines = [], isLoading: dueLoading } = useMaintenanceDue(14)
  const { data: pendingRepairs } = useRepairProposals({ status: 'PENDING', pageSize: 1 })
  const { data: pendingTransfers } = useTransfers({ status: 'PENDING', page: 1 })
  const { data: alerts } = useMechanicAlerts()

  const machines = machinesData?.data ?? []
  const total = machinesData?.total ?? machines.length
  const countBy = (s: MachineStatus) => machines.filter((m) => m.status === s).length

  const pendingApprovalCount =
    (alerts?.pendingApprovals.plans.length ?? 0) + (alerts?.pendingApprovals.partRequests.length ?? 0)

  return (
    <PageWrapper
      title="Tổng quan máy móc"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Tổng quan' }]}
    >
      <div className="row">
        <KpiCard label="Tổng số máy" value={total} icon="fe-hard-drive" color="#6259ca" />
        <KpiCard label="Đang chạy" value={countBy('RUNNING')} icon="fe-check-circle" color="#27ae60" />
        <KpiCard label="Đang bảo dưỡng" value={countBy('MAINTENANCE')} icon="fe-tool" color="#f7b731" />
        <KpiCard label="Đang hỏng" value={countBy('BROKEN')} icon="fe-alert-triangle" color="#eb5757" />
      </div>
      <div className="row">
        <KpiCard label="Phiếu báo hỏng đang mở" value={alerts?.pendingBreakdowns.length ?? 0} icon="fe-alert-octagon" color="#eb5757" />
        <KpiCard label="Phiếu SC/BD đang xử lý" value={alerts?.openWorkOrders.length ?? 0} icon="fe-tool" color="#f2994a" />
        <KpiCard label="Hồ sơ chờ duyệt" value={pendingApprovalCount} icon="fe-check-square" color="#2d9cdb" />
        <KpiCard label="Phụ tùng dưới định mức" value={alerts?.lowStocks.length ?? 0} icon="fe-package" color="#9b51e0" />
      </div>
      <div className="row">
        <KpiCard label="Sắp đến hạn bảo dưỡng" value={dueMachines.length} icon="fe-clock" color="#eb5757" />
        <KpiCard label="Quá hạn bảo dưỡng" value={alerts?.overdueMaintenance.length ?? 0} icon="fe-alert-triangle" color="#c0392b" />
        <KpiCard label="Chứng chỉ sắp hết hạn" value={alerts?.expiringCertificates.length ?? 0} icon="fe-shield" color="#16a085" />
        <KpiCard label="Đề xuất / điều chuyển chờ" value={(pendingRepairs?.total ?? 0) + (pendingTransfers?.total ?? 0)} icon="fe-repeat" color="#8e44ad" />
      </div>

      {/* Phiếu báo hỏng chưa xử lý xong — việc cần làm trước tiên của cơ điện */}
      {alerts && alerts.pendingBreakdowns.length > 0 && (
        <div className="card mb-3">
          <div className="card-header d-flex align-items-center justify-content-between gap-2">
            <h6 className="card-title mb-0"><i className="fe fe-alert-octagon text-danger me-1"></i> Phiếu báo hỏng đang mở</h6>
            <Link to="/machines/breakdowns" className="btn btn-sm btn-outline-secondary text-nowrap">Xem tất cả</Link>
          </div>
          <div className="card-body p-0"><div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr><th>Số phiếu</th><th>Máy</th><th>Hiện tượng</th><th className="text-center">Mức độ</th><th className="text-center">Ngày báo</th></tr>
              </thead>
              <tbody>
                {alerts.pendingBreakdowns.slice(0, 8).map((b) => (
                  <tr key={b.id}>
                    <td><code>{b.reportNo}</code></td>
                    <td>
                      <Link to={`/machines/${b.machine?.id}`} className="fw-medium text-decoration-none">{b.machine?.code}</Link>
                      <div className="small text-muted">{b.machine?.name}</div>
                    </td>
                    <td className="small" style={{ maxWidth: 280 }}>{b.symptom}</td>
                    <td className="text-center small">{SEVERITY_LABELS[b.severity as BreakdownSeverity] ?? b.severity}</td>
                    <td className="text-center small">{fmtDate(b.reportedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </div>
      )}

      {/* Cảnh báo tồn kho và chứng chỉ */}
      <div className="row">
        {alerts && alerts.lowStocks.length > 0 && (
          <div className="col-lg-6">
            <div className="card mb-3">
              <div className="card-header d-flex align-items-center justify-content-between gap-2">
                <h6 className="card-title mb-0"><i className="fe fe-package text-warning me-1"></i> Phụ tùng dưới định mức tồn</h6>
                <Link to="/machines/stocks" className="btn btn-sm btn-outline-secondary text-nowrap">Xem kho</Link>
              </div>
              <div className="card-body p-0"><div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="thead-light">
                    <tr><th>Mã</th><th>Tên phụ tùng</th><th className="text-end">Tồn</th><th className="text-end">Tối thiểu</th></tr>
                  </thead>
                  <tbody>
                    {alerts.lowStocks.slice(0, 8).map((s) => (
                      <tr key={s.sparePartId}>
                        <td><code>{s.code}</code></td>
                        <td className="small">{s.name}</td>
                        <td className="text-end text-danger fw-medium">{s.quantity} {s.unit ?? ''}</td>
                        <td className="text-end small text-muted">{s.minQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>
          </div>
        )}

        {alerts && alerts.expiringCertificates.length > 0 && (
          <div className="col-lg-6">
            <div className="card mb-3">
              <div className="card-header d-flex align-items-center justify-content-between gap-2">
                <h6 className="card-title mb-0"><i className="fe fe-shield text-success me-1"></i> Chứng chỉ sắp / đã hết hạn</h6>
                <Link to="/machines/certificates" className="btn btn-sm btn-outline-secondary text-nowrap">Xem tất cả</Link>
              </div>
              <div className="card-body p-0"><div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="thead-light">
                    <tr><th>Máy</th><th>Chứng chỉ</th><th className="text-center">Hết hạn</th></tr>
                  </thead>
                  <tbody>
                    {alerts.expiringCertificates.slice(0, 8).map((c) => (
                      <tr key={c.id}>
                        <td className="small">
                          <Link to={`/machines/${c.machine?.id}`} className="text-decoration-none">{c.machine?.code}</Link>
                        </td>
                        <td className="small">{c.name}</td>
                        <td className="text-center small">
                          {fmtDate(c.expiryDate)}
                          {c.daysLeft != null && (
                            <div>
                              {c.daysLeft < 0
                                ? <span className="badge bg-danger">Quá {-c.daysLeft} ngày</span>
                                : <span className="badge bg-warning text-dark">Còn {c.daysLeft} ngày</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>
          </div>
        )}
      </div>

      {/* Hồ sơ đang chờ duyệt: kế hoạch và yêu cầu mua vật tư */}
      {alerts && pendingApprovalCount > 0 && (
        <div className="card mb-3">
          <div className="card-header"><h6 className="card-title mb-0"><i className="fe fe-check-square text-info me-1"></i> Hồ sơ chờ duyệt</h6></div>
          <div className="card-body p-0"><div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="thead-light">
                <tr><th>Loại</th><th>Số hồ sơ</th><th>Nội dung</th><th className="text-end">Giá trị</th><th className="text-center">Trạng thái</th></tr>
              </thead>
              <tbody>
                {alerts.pendingApprovals.plans.map((p) => (
                  <tr key={`plan-${p.id}`}>
                    <td className="small">Kế hoạch</td>
                    <td><Link to="/machines/plans" className="text-decoration-none"><code>{p.planNo}</code></Link></td>
                    <td className="small">{p.title}</td>
                    <td className="text-end small">{p.totalEstimatedCost != null ? Number(p.totalEstimatedCost).toLocaleString('vi-VN') : '—'}</td>
                    <td className="text-center small">{p.status === 'PENDING_FACTORY' ? 'Chờ GĐ xưởng' : 'Chờ công ty'}</td>
                  </tr>
                ))}
                {alerts.pendingApprovals.partRequests.map((r) => (
                  <tr key={`req-${r.id}`}>
                    <td className="small">Mua vật tư</td>
                    <td><Link to="/machines/part-requests" className="text-decoration-none"><code>{r.requestNo}</code></Link></td>
                    <td className="small">{r.title}</td>
                    <td className="text-end small">{r.totalAmount != null ? Number(r.totalAmount).toLocaleString('vi-VN') : '—'}</td>
                    <td className="text-center small">{r.status === 'PENDING_FACTORY' ? 'Chờ GĐ xưởng' : 'Chờ công ty'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </div>
      )}

      {/* Máy sắp / đã đến hạn bảo dưỡng */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between gap-2">
          <h6 className="card-title mb-0"><i className="fe fe-alert-triangle text-danger me-1"></i> Máy cần bảo dưỡng (≤14 ngày / quá hạn)</h6>
          <Link to="/machines/maintenance" className="btn btn-sm btn-outline-secondary text-nowrap flex-shrink-0">Xem tất cả</Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr><th>Mã máy</th><th>Tên máy</th><th>Chuyền</th><th>Hạn bảo dưỡng</th><th>Tình trạng</th></tr>
              </thead>
              <tbody>
                {dueLoading ? (
                  <tr><td colSpan={5} className="text-center py-4 text-muted">Đang tải...</td></tr>
                ) : dueMachines.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-muted">Tất cả máy đều trong hạn bảo dưỡng</td></tr>
                ) : (
                  dueMachines.map((m: any) => (
                    <tr key={m.id}>
                      <td><Link to={`/machines/${m.id}`} className="text-decoration-none"><code>{m.code}</code></Link></td>
                      <td className="fw-medium">{m.name}</td>
                      <td className="text-muted small">{m.line?.name ?? '—'}</td>
                      <td>{fmtDate(m.nextDueDate)}</td>
                      <td>
                        {m.isOverdue
                          ? <span className="badge bg-danger">Quá hạn</span>
                          : <span className="badge bg-warning text-dark">Sắp tới hạn</span>}
                        <span className="ms-2 small text-muted">{MACHINE_STATUS_LABELS[m.status as MachineStatus]}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
