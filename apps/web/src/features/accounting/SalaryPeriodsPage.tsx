import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useSalaryPeriods } from './accounting.hooks'
import { UploadSalaryPeriodDialog } from './UploadSalaryPeriodDialog'

const vnd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (v: string | undefined) => vnd.format(Math.round(Number(v || 0)))

export default function SalaryPeriodsPage() {
  const navigate = useNavigate()
  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('ACCOUNTANT')

  const [uploadOpen, setUploadOpen] = useState(false)
  const { data: periods, isLoading, isError } = useSalaryPeriods()

  return (
    <PageWrapper
      title="Gửi bảng lương"
      breadcrumbs={[{ label: 'Kế toán' }, { label: 'Gửi bảng lương' }]}
      actions={
        canWrite && (
          <button onClick={() => setUploadOpen(true)} className="btn btn-primary btn-icon text-white">
            <span><i className="fe fe-upload"></i></span> Tải lên bảng lương
          </button>
        )
      }
    >
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center text-muted py-5">Đang tải...</div>
          ) : isError ? (
            <div className="text-center text-danger py-5">Không tải được danh sách kỳ lương.</div>
          ) : (periods?.length ?? 0) === 0 ? (
            <div className="text-center text-muted py-5">Chưa có kỳ lương nào — tải lên file Excel để bắt đầu.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-vcenter mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>Kỳ lương</th>
                    <th>Số nhân viên</th>
                    <th className="text-end">Tổng quỹ lương</th>
                    <th>Đã gửi email</th>
                    <th>File nguồn</th>
                    <th>Ngày tải lên</th>
                  </tr>
                </thead>
                <tbody>
                  {periods!.map((p) => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounting/${p.id}`)}>
                      <td className="fw-medium">Tháng {p.month}/{p.year}</td>
                      <td>{p.slipCount ?? 0}</td>
                      <td className="text-end fw-semibold">{money(p.totalNetSalary)}</td>
                      <td>
                        <span className={`badge ${p.sentCount === p.slipCount && (p.slipCount ?? 0) > 0 ? 'bg-success-transparent text-success' : 'bg-secondary-transparent'}`}>
                          {p.sentCount ?? 0} / {p.slipCount ?? 0}
                        </span>
                      </td>
                      <td className="text-muted small">{p.sourceFileName}</td>
                      <td className="text-muted small">{new Date(p.uploadedAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <UploadSalaryPeriodDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(periodId) => { setUploadOpen(false); navigate(`/accounting/${periodId}`) }}
      />
    </PageWrapper>
  )
}
