import { useMemo, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useLinePayroll } from './payroll.hooks'
import { currentMonth, formatVnd, formatNum } from './payroll.utils'

export default function PayrollLinePage() {
  const [month, setMonth] = useState(currentMonth())
  const [factoryId, setFactoryId] = useState<number | ''>('')

  const { data, isLoading, isError } = useLinePayroll({
    month,
    factoryId: factoryId === '' ? undefined : factoryId,
  })
  const rows = data?.rows ?? []

  // Danh sách xưởng để lọc — suy ra từ dữ liệu trả về
  const factories = useMemo(() => {
    const map = new Map<number, string>()
    rows.forEach((r) => map.set(r.factoryId, r.factoryName))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const displayRows =
    factoryId === '' ? rows : rows.filter((r) => r.factoryId === factoryId)

  const totalMoney = displayRows.reduce((s, r) => s + r.totalMoney, 0)
  const totalPredicted = displayRows.reduce((s, r) => s + r.predictedMoney, 0)

  return (
    <PageWrapper title="Lương chuyền may" breadcrumbs={[{ label: 'Bảng lương' }, { label: 'Lương chuyền may' }]}>
      <div className="card">
        <div className="card-header d-flex flex-wrap align-items-center gap-3">
          <div>
            <label className="form-label small text-muted mb-1">Tháng</label>
            <input type="month" className="form-control form-control-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="form-label small text-muted mb-1">Xưởng</label>
            <select className="form-select form-select-sm" value={factoryId} onChange={(e) => setFactoryId(e.target.value === '' ? '' : +e.target.value)}>
              <option value="">Tất cả xưởng</option>
              {factories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div className="ms-auto text-end small text-muted">
            <div>Tổng tiền tháng (MTD): <span className="fw-bold text-dark">{formatVnd(totalMoney)} đ</span></div>
            <div>Dự đoán cuối tháng: <span className="fw-bold text-primary">{formatVnd(totalPredicted)} đ</span></div>
          </div>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center text-muted py-5">Đang tải…</div>
          ) : isError ? (
            <div className="text-center text-danger py-5">Không tải được dữ liệu lương.</div>
          ) : displayRows.length === 0 ? (
            <div className="text-center text-muted py-5">Chưa có dữ liệu sản lượng trong tháng này.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>Xưởng</th>
                    <th>Chuyền</th>
                    <th className="text-end">Sản lượng</th>
                    <th className="text-end">Tổng tiền (MTD)</th>
                    <th className="text-center">Số CN</th>
                    <th className="text-end">Lương/người (hiện tại)</th>
                    <th className="text-end">Dự đoán lương/người</th>
                    <th className="text-center">Ngày có SL</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => (
                    <tr key={r.lineId}>
                      <td>{r.factoryName}</td>
                      <td className="fw-medium">{r.lineName}</td>
                      <td className="text-end">{formatNum(r.totalQuantity)}</td>
                      <td className="text-end">{formatVnd(r.totalMoney)}</td>
                      <td className="text-center">{r.workerCount}</td>
                      <td className="text-end fw-semibold">{formatVnd(r.perWorkerMtd)}</td>
                      <td className="text-end fw-semibold text-primary">{formatVnd(r.perWorkerPredicted)}</td>
                      <td className="text-center text-muted">{r.activeDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-muted small mt-3 mb-0">
            Lương/người = tổng tiền chuyền làm được ÷ số công nhân. Đơn giá ưu tiên giá trợ giá của BOD (nếu có).
            Dự đoán cuối tháng = ngoại suy theo nhịp sản lượng hiện tại × số ngày công chuẩn.
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
