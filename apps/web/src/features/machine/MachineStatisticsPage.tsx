import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMachineStatistics } from './machine-profile.hooks'
import { MACHINE_STATUS_LABELS, type MachineStatus } from './machine.api'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ExcelToolbar } from '@/components/shared/ExcelToolbar'

const fmtNum = (n: number) => Number(n).toLocaleString('vi-VN')

const firstOfYear = () => `${new Date().getFullYear()}-01-01`
const today = () => new Date().toISOString().slice(0, 10)

/** Thống kê hoạt động máy móc: số lần hỏng, giờ dừng máy và chi phí theo từng máy. */
export default function MachineStatisticsPage() {
  const [fromDate, setFromDate] = useState(firstOfYear())
  const [toDate, setToDate] = useState(today())
  const [sortBy, setSortBy] = useState<'breakdownCount' | 'downtimeHours' | 'totalCost'>('breakdownCount')

  const { data, isLoading, refetch } = useMachineStatistics({ fromDate, toDate })
  const summary = data?.summary
  const rows = [...(data?.rows ?? [])].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]))

  const exportRows = () =>
    rows.map((r) => ({
      'Mã máy': r.machineCode,
      'Tên máy': r.machineName,
      'Xưởng': r.factory?.name ?? '',
      'Chuyền': r.line?.name ?? '',
      'Số lần hỏng': r.breakdownCount,
      'Lần dừng SX': r.stoppedProductionCount,
      'Số lần sửa': r.repairCount,
      'Số lần BD': r.maintenanceCount,
      'Giờ dừng máy': r.downtimeHours,
      'Chi phí sửa': r.repairCost,
      'Chi phí BD': r.maintenanceCost,
      'Tổng chi phí': r.totalCost,
    }))

  const cards = [
    { label: 'Số máy theo dõi', value: summary?.machineCount ?? 0, icon: 'fe fe-hard-drive', color: '#6259ca' },
    { label: 'Lượt hỏng hóc', value: summary?.breakdownCount ?? 0, icon: 'fe fe-alert-octagon', color: '#dc3545' },
    { label: 'Lượt sửa chữa', value: summary?.repairCount ?? 0, icon: 'fe fe-tool', color: '#fd7e14' },
    { label: 'Lượt bảo dưỡng', value: summary?.maintenanceCount ?? 0, icon: 'fe fe-settings', color: '#198754' },
    { label: 'Giờ dừng máy', value: summary?.downtimeHours ?? 0, icon: 'fe fe-clock', color: '#0dcaf0' },
    { label: 'Tổng chi phí (đ)', value: summary?.totalCost ?? 0, icon: 'fe fe-dollar-sign', color: '#20c997' },
  ]

  return (
    <PageWrapper
      title="Thống kê hoạt động máy móc"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Thống kê hoạt động' }]}
      actions={
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
          <ExcelToolbar sheetName="Thống kê máy" fileBase="thong-ke-may-moc" exportRows={exportRows} templateRows={exportRows()} canWrite={false} entityLabel="dòng thống kê" />
        </div>
      }
    >
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <label className="small text-muted d-block">Từ ngày</label>
          <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="small text-muted d-block">Đến ngày</label>
          <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="small text-muted d-block">Sắp xếp theo</label>
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="breakdownCount">Số lần hỏng</option>
            <option value="downtimeHours">Giờ dừng máy</option>
            <option value="totalCost">Tổng chi phí</option>
          </select>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {cards.map((c) => (
          <div key={c.label} className="col-6 col-md-4 col-xl-2">
            <div className="card h-100">
              <div className="card-body text-center p-3">
                <i className={c.icon} style={{ fontSize: 22, color: c.color }}></i>
                <div className="fw-bold mt-2" style={{ fontSize: 20 }}>{fmtNum(c.value)}</div>
                <div className="text-muted small">{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {summary && summary.topBreakdownMachines.length > 0 && (
        <div className="card mb-3">
          <div className="card-header"><h6 className="card-title mb-0">Máy hỏng nhiều nhất</h6></div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2">
              {summary.topBreakdownMachines.map((m) => (
                <Link key={m.machineId} to={`/machines/${m.machineId}`} className="border rounded px-3 py-2 text-decoration-none">
                  <div className="fw-medium small">{m.machineCode}</div>
                  <div className="text-muted small">{m.machineName}</div>
                  <div className="text-danger small">{m.breakdownCount} lần hỏng · {fmtNum(m.downtimeHours)} giờ dừng</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light">
            <tr>
              <th>Máy</th><th>Chuyền</th><th className="text-center">Trạng thái</th>
              <th className="text-end">Lần hỏng</th><th className="text-end">Dừng SX</th>
              <th className="text-end">Lần sửa</th><th className="text-end">Lần BD</th>
              <th className="text-end">Giờ dừng</th><th className="text-end">Chi phí sửa</th>
              <th className="text-end">Chi phí BD</th><th className="text-end">Tổng chi phí</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={11} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-4 text-muted">Không có dữ liệu trong khoảng thời gian này</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.machineId}>
                  <td>
                    <Link to={`/machines/${r.machineId}`} className="fw-medium">{r.machineCode}</Link>
                    <div className="small text-muted">{r.machineName}</div>
                  </td>
                  <td className="small text-muted">{r.line?.name ?? '—'}</td>
                  <td className="text-center small">{MACHINE_STATUS_LABELS[r.status as MachineStatus] ?? r.status}</td>
                  <td className="text-end">{r.breakdownCount || '—'}</td>
                  <td className="text-end">{r.stoppedProductionCount || '—'}</td>
                  <td className="text-end">{r.repairCount || '—'}</td>
                  <td className="text-end">{r.maintenanceCount || '—'}</td>
                  <td className="text-end">{r.downtimeHours ? fmtNum(r.downtimeHours) : '—'}</td>
                  <td className="text-end small">{r.repairCost ? fmtNum(r.repairCost) : '—'}</td>
                  <td className="text-end small">{r.maintenanceCost ? fmtNum(r.maintenanceCost) : '—'}</td>
                  <td className="text-end fw-medium">{r.totalCost ? fmtNum(r.totalCost) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>
    </PageWrapper>
  )
}
