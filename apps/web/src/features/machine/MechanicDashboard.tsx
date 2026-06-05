import { Link } from 'react-router-dom'
import { useMachines, useMaintenanceDue, useTransfers } from './machine.hooks'
import { useRepairProposals } from './repair.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MACHINE_STATUS_LABELS, type MachineStatus } from './machine.api'

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

  const machines = machinesData?.data ?? []
  const total = machinesData?.total ?? machines.length
  const countBy = (s: MachineStatus) => machines.filter((m) => m.status === s).length

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
        <KpiCard label="Sắp đến hạn bảo dưỡng" value={dueMachines.length} icon="fe-clock" color="#eb5757" />
        <KpiCard label="Đề xuất chờ duyệt" value={pendingRepairs?.total ?? 0} icon="fe-clipboard" color="#2d9cdb" />
        <KpiCard label="Lệnh điều chuyển chờ" value={pendingTransfers?.total ?? 0} icon="fe-repeat" color="#9b51e0" />
        <div className="col-6 col-lg-3">
          <div className="card mb-3">
            <div className="card-body d-flex flex-column gap-2 justify-content-center h-100">
              <Link to="/machines/repairs" className="btn btn-sm btn-primary text-white">+ Đề xuất sửa chữa</Link>
              <Link to="/machines/transfers" className="btn btn-sm btn-outline-secondary">+ Điều chuyển máy</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Máy sắp / đã đến hạn bảo dưỡng */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0"><i className="fe fe-alert-triangle text-danger me-1"></i> Máy cần bảo dưỡng (≤14 ngày / quá hạn)</h6>
          <Link to="/machines/maintenance" className="btn btn-sm btn-outline-secondary">Xem tất cả</Link>
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
