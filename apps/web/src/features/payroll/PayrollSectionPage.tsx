import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useSectionPayroll } from './payroll.hooks'
import type { SectionPayroll } from './payroll.api'
import { currentMonth, formatVnd, formatNum } from './payroll.utils'

// Một khối hiển thị 1 bộ phận (Cắt hoặc Hoàn thành)
function SectionCell({ s }: { s: SectionPayroll }) {
  return (
    <>
      <td className="text-end">{formatNum(s.totalQuantity)}</td>
      <td className="text-end">{formatVnd(s.totalMoney)}</td>
      <td className="text-center">{s.workerCount}</td>
      <td className="text-end fw-semibold">{formatVnd(s.perWorkerMtd)}</td>
      <td className="text-end fw-semibold text-primary">{formatVnd(s.perWorkerPredicted)}</td>
    </>
  )
}

export default function PayrollSectionPage() {
  const [month, setMonth] = useState(currentMonth())
  const { data, isLoading, isError } = useSectionPayroll({ month })
  const rows = data?.rows ?? []

  return (
    <PageWrapper title="Lương tổ Cắt / Hoàn thành" breadcrumbs={[{ label: 'Bảng lương' }, { label: 'Lương Cắt / Hoàn thành' }]}>
      <div className="card">
        <div className="card-header d-flex flex-wrap align-items-center gap-3">
          <div>
            <label className="form-label small text-muted mb-1">Tháng</label>
            <input type="month" className="form-control form-control-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center text-muted py-5">Đang tải…</div>
          ) : isError ? (
            <div className="text-center text-danger py-5">Không tải được dữ liệu lương.</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted py-5">Chưa có dữ liệu trong tháng này.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle mb-0 text-nowrap">
                <thead className="thead-light">
                  <tr>
                    <th rowSpan={2} className="align-middle">Xưởng</th>
                    <th colSpan={5} className="text-center">Tổ Cắt</th>
                    <th colSpan={5} className="text-center">Tổ Hoàn thành</th>
                  </tr>
                  <tr>
                    <th className="text-end">SL</th>
                    <th className="text-end">Tổng tiền</th>
                    <th className="text-center">Số CN</th>
                    <th className="text-end">Lương/người</th>
                    <th className="text-end">Dự đoán/người</th>
                    <th className="text-end">SL</th>
                    <th className="text-end">Tổng tiền</th>
                    <th className="text-center">Số CN</th>
                    <th className="text-end">Lương/người</th>
                    <th className="text-end">Dự đoán/người</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.factoryId}>
                      <td className="fw-medium">{r.factoryName}</td>
                      <SectionCell s={r.cutting} />
                      <SectionCell s={r.finishing} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-muted small mt-3 mb-0">
            Tổ Cắt và Hoàn thành ăn theo % đơn giá chuyền may (cấu hình tại Cài đặt → Cấu hình tính lương).
            Lương/người = tổng tiền bộ phận ÷ số công nhân của tổ tại xưởng.
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
