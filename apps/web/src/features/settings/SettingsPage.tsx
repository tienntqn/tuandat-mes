import React, { useEffect, useState } from 'react'
import { useReportSettings } from '@/features/report/report.hooks'
import { useAppSettings, useUpdateAppSettings } from './settings.hooks'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuthStore } from '@/stores/auth.store'

// Settings hiện tại là đọc từ env (OUTPUT_CUTOFF_HOUR, ALERT_SLOW_PCT)
// Màn hình này cho Admin xem + hướng dẫn cách thay đổi
// Có thể mở rộng sau: lưu vào DB và cho phép edit qua API

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-light px-2 py-0.5 small" style={{ borderRadius: 4 }}>{children}</code>
  )
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useReportSettings()
  const { data: appSettings } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const { user } = useAuthStore()

  const isAdmin = user?.roles.includes('ADMIN') ?? false
  const qcEnabled = appSettings?.qcReportingEnabled ?? false

  // Cấu hình tính lương (state cục bộ, lưu khi bấm nút)
  const [payroll, setPayroll] = useState({ cuttingRatePct: 8, finishingRatePct: 5, payrollWorkingDays: 26 })
  useEffect(() => {
    if (appSettings) {
      setPayroll({
        cuttingRatePct: appSettings.cuttingRatePct,
        finishingRatePct: appSettings.finishingRatePct,
        payrollWorkingDays: appSettings.payrollWorkingDays,
      })
    }
  }, [appSettings])

  if (!isAdmin) {
    return (
      <div className="main-container container-fluid d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 200 }}>
        Bạn không có quyền truy cập trang này.
      </div>
    )
  }

  return (
    <PageWrapper
      title="Cài đặt hệ thống"
      breadcrumbs={[{ label: 'Cài đặt' }, { label: 'Cài đặt chung' }]}
    >
      <p className="text-muted mb-4">Quản lý các thông số vận hành</p>

      <div style={{ maxWidth: 672 }}>
        {/* Cutoff time */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="d-flex align-items-center gap-2">
              <i className="fe fe-clock text-primary"></i>
              <h6 className="card-title mb-0">Giờ khoá nhập sản lượng</h6>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Sau giờ này tổ trưởng không thể nhập/sửa sản lượng của ngày hôm đó
            </p>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="placeholder-glow">
                <span className="placeholder col-3" style={{ height: 48 }}></span>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-4 mb-3">
                <span className="fw-bold tabular-nums" style={{ fontSize: '2.5rem' }}>
                  {settings?.cutoffHour ?? 19}:00
                </span>
                <div className="text-muted small">
                  <p className="mb-1">Giá trị hiện tại</p>
                  <p className="mb-0">
                    Cấu hình qua biến môi trường: <InfoBadge>OUTPUT_CUTOFF_HOUR</InfoBadge>
                  </p>
                </div>
              </div>
            )}
            <div className="alert alert-info d-flex gap-2 mb-0">
              <i className="fe fe-info flex-shrink-0 mt-1"></i>
              <p className="small mb-0">
                Để thay đổi giờ khoá, cập nhật biến <InfoBadge>OUTPUT_CUTOFF_HOUR</InfoBadge> trong file{' '}
                <InfoBadge>.env</InfoBadge> của server API và khởi động lại service.
              </p>
            </div>
          </div>
        </div>

        {/* Alert threshold */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="d-flex align-items-center gap-2">
              <i className="fe fe-alert-triangle text-warning"></i>
              <h6 className="card-title mb-0">Ngưỡng cảnh báo tiến độ chậm</h6>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Hệ thống cảnh báo khi % thực tế &lt; ngưỡng này so với % kỳ vọng theo timeline
            </p>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="placeholder-glow">
                <span className="placeholder col-3" style={{ height: 48 }}></span>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-4 mb-3">
                <span className="fw-bold tabular-nums" style={{ fontSize: '2.5rem' }}>
                  {settings?.alertSlowPct ?? 80}%
                </span>
                <div className="text-muted small">
                  <p className="mb-1">Của tiến độ kỳ vọng</p>
                  <p className="mb-0">
                    Cấu hình qua: <InfoBadge>ALERT_SLOW_PCT</InfoBadge>
                  </p>
                </div>
              </div>
            )}
            <div className="alert alert-warning d-flex gap-2 mb-0">
              <i className="fe fe-info flex-shrink-0 mt-1"></i>
              <p className="small mb-0">
                Ví dụ: ngưỡng 80% nghĩa là nếu kỳ vọng hoàn thành 50% nhưng thực tế chỉ đạt &lt;40%
                thì hệ thống hiển thị cảnh báo đỏ. Cập nhật biến{' '}
                <InfoBadge>ALERT_SLOW_PCT</InfoBadge> trong file <InfoBadge>.env</InfoBadge>.
              </p>
            </div>
          </div>
        </div>

        {/* Bộ phận KCS tham gia báo cáo (ghi được vào DB) */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="d-flex align-items-center gap-2">
              <i className="fe fe-check-circle text-success"></i>
              <h6 className="card-title mb-0">Bộ phận KCS tham gia báo cáo sản lượng</h6>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Khi bật, tổ KCS cấp xưởng sẽ nhập sản lượng theo Màu × Size (giống tổ Cắt). Khi tắt, KCS không tham gia.
            </p>
          </div>
          <div className="card-body">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="qcToggle"
                checked={qcEnabled}
                disabled={updateSettings.isPending}
                onChange={(e) => updateSettings.mutate({ qcReportingEnabled: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="qcToggle">
                {qcEnabled ? 'Đang BẬT — KCS có báo cáo sản lượng' : 'Đang TẮT — KCS chưa báo cáo sản lượng'}
              </label>
            </div>
          </div>
        </div>

        {/* Cấu hình tính lương */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="d-flex align-items-center gap-2">
              <i className="fe fe-dollar-sign text-success"></i>
              <h6 className="card-title mb-0">Cấu hình tính lương</h6>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Tổ Cắt và Hoàn thành ăn theo % đơn giá chuyền may. Số ngày công dùng để dự đoán lương cuối tháng.
            </p>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label small text-muted">% Tổ Cắt</label>
                <div className="input-group">
                  <input type="number" min={0} max={100} className="form-control" value={payroll.cuttingRatePct}
                    onChange={(e) => setPayroll((p) => ({ ...p, cuttingRatePct: +e.target.value }))} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted">% Tổ Hoàn thành</label>
                <div className="input-group">
                  <input type="number" min={0} max={100} className="form-control" value={payroll.finishingRatePct}
                    onChange={(e) => setPayroll((p) => ({ ...p, finishingRatePct: +e.target.value }))} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted">Số ngày công / tháng</label>
                <input type="number" min={1} max={31} className="form-control" value={payroll.payrollWorkingDays}
                  onChange={(e) => setPayroll((p) => ({ ...p, payrollWorkingDays: +e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={updateSettings.isPending}
              onClick={() => updateSettings.mutate(payroll)}>
              {updateSettings.isPending ? 'Đang lưu...' : 'Lưu cấu hình lương'}
            </button>
          </div>
        </div>

        {/* Thông tin hệ thống */}
        <div className="card">
          <div className="card-header">
            <h6 className="card-title mb-0">Thông tin hệ thống</h6>
          </div>
          <div className="card-body">
            <dl className="row mb-0">
              {[
                ['Phiên bản', 'Tuấn Đạt MES v1.0'],
                ['Tech Stack', 'NestJS + React + PostgreSQL'],
                ['Người dùng hiện tại', user?.fullName ?? '—'],
                ['Vai trò', user?.roles.join(', ') ?? '—'],
              ].map(([label, value]) => (
                <React.Fragment key={label as string}>
                  <dt className="col-sm-4 text-muted">{label}</dt>
                  <dd className="col-sm-8 fw-medium">{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
