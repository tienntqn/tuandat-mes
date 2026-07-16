import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuthStore } from '@/stores/auth.store'
import { useSalaryPeriod, useSendSalaryEmails, useDeleteSalaryPeriod } from './accounting.hooks'
import type { SalarySlip } from './accounting.api'

const vnd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (v: string) => vnd.format(Math.round(Number(v || 0)))

export default function SalaryPeriodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const periodId = Number(id)
  const navigate = useNavigate()
  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('ACCOUNTANT')

  const { data: period, isLoading, isError } = useSalaryPeriod(periodId)
  const sendEmails = useSendSalaryEmails()
  const deletePeriod = useDeleteSalaryPeriod()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const slips = period?.slips ?? []
  const allSelected = slips.length > 0 && selected.size === slips.length

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(slips.map((s) => s.id)))
  }
  const toggleOne = (slipId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slipId)) next.delete(slipId)
      else next.add(slipId)
      return next
    })
  }

  const unmatchedCount = useMemo(() => slips.filter((s) => s.employeeId == null).length, [slips])
  const noEmailCount = useMemo(() => slips.filter((s) => !s.email).length, [slips])

  const statusBadge = (s: SalarySlip) => {
    if (s.emailSentAt) {
      return <span className="badge bg-success-transparent text-success">Đã gửi</span>
    }
    if (s.emailError) {
      return <span className="badge bg-danger-transparent text-danger" title={s.emailError}>Lỗi gửi</span>
    }
    if (!s.email) {
      return <span className="badge bg-secondary-transparent">Không có email</span>
    }
    return <span className="badge bg-warning-transparent text-warning">Chưa gửi</span>
  }

  if (isLoading) {
    return <PageWrapper title="Chi tiết kỳ lương" breadcrumbs={[{ label: 'Kế toán' }, { label: 'Kỳ lương' }]}>
      <div className="text-center text-muted py-5">Đang tải...</div>
    </PageWrapper>
  }
  if (isError || !period) {
    return <PageWrapper title="Chi tiết kỳ lương" breadcrumbs={[{ label: 'Kế toán' }, { label: 'Kỳ lương' }]}>
      <div className="text-center text-danger py-5">Không tải được kỳ lương này.</div>
    </PageWrapper>
  }

  return (
    <PageWrapper
      title={`Bảng lương tháng ${period.month}/${period.year}`}
      breadcrumbs={[{ label: 'Kế toán', href: '/accounting' }, { label: `Tháng ${period.month}/${period.year}` }]}
      actions={
        canWrite && (
          <div className="d-flex gap-2">
            <button
              onClick={() => sendEmails.mutate({ periodId, slipIds: [...selected] })}
              disabled={selected.size === 0 || sendEmails.isPending}
              className="btn btn-outline-primary"
            >
              Gửi email đã chọn ({selected.size})
            </button>
            <button
              onClick={() => sendEmails.mutate({ periodId })}
              disabled={sendEmails.isPending}
              className="btn btn-primary text-white"
            >
              {sendEmails.isPending ? 'Đang gửi...' : 'Gửi tất cả chưa gửi'}
            </button>
            <button onClick={() => setDeleteConfirm(true)} className="btn btn-outline-danger btn-icon">
              <i className="fe fe-trash-2"></i>
            </button>
          </div>
        )
      }
    >
      <div className="mb-3 d-flex gap-4 small text-muted">
        <span><Link to="/accounting">&larr; Danh sách kỳ lương</Link></span>
        <span>File nguồn: <strong>{period.sourceFileName}</strong></span>
        {unmatchedCount > 0 && (
          <span className="text-warning">⚠ {unmatchedCount} dòng không khớp nhân viên trong hệ thống</span>
        )}
        {noEmailCount > 0 && (
          <span className="text-warning">⚠ {noEmailCount} dòng không có email</span>
        )}
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-vcenter mb-0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th>MSNV</th>
                  <th>Họ tên</th>
                  <th>Phòng</th>
                  <th>Email</th>
                  <th className="text-end">Tổng lương</th>
                  <th className="text-end">Thực nhận</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {slips.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                ) : (
                  slips.map((s) => (
                    <tr key={s.id}>
                      <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} /></td>
                      <td><code>{s.employeeCode}</code></td>
                      <td className="fw-medium">
                        {s.fullName}
                        {s.employeeId == null && (
                          <span className="badge bg-warning-transparent text-warning ms-2">Không khớp NV hệ thống</span>
                        )}
                      </td>
                      <td className="text-muted small">{s.department}</td>
                      <td className="text-muted small">{s.email ?? '—'}</td>
                      <td className="text-end">{money(s.totalSalary)}</td>
                      <td className="text-end fw-semibold">{money(s.netSalary)}</td>
                      <td>{statusBadge(s)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Xoá kỳ lương"
        description={`Bạn có chắc muốn xoá kỳ lương tháng ${period.month}/${period.year}? Toàn bộ dữ liệu đã đọc từ file sẽ bị xoá.`}
        confirmLabel="Xoá"
        destructive
        isPending={deletePeriod.isPending}
        onConfirm={() => deletePeriod.mutate(periodId, { onSuccess: () => navigate('/accounting') })}
        onClose={() => setDeleteConfirm(false)}
      />
    </PageWrapper>
  )
}
