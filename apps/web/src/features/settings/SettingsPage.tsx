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
  // Cấu hình in tem QR
  const [qr, setQr] = useState({ qrPrinterName: '', qrLabelWidthMm: 50, qrLabelHeightMm: 30 })
  // Cấu hình phân hệ máy móc thiết bị
  const [machine, setMachine] = useState({ machineCompanyApprovalThreshold: 0, machineCertAlertDays: 30 })
  useEffect(() => {
    if (appSettings) {
      setPayroll({
        cuttingRatePct: appSettings.cuttingRatePct,
        finishingRatePct: appSettings.finishingRatePct,
        payrollWorkingDays: appSettings.payrollWorkingDays,
      })
      setQr({
        qrPrinterName: appSettings.qrPrinterName ?? '',
        qrLabelWidthMm: appSettings.qrLabelWidthMm ?? 50,
        qrLabelHeightMm: appSettings.qrLabelHeightMm ?? 30,
      })
      setMachine({
        machineCompanyApprovalThreshold: appSettings.machineCompanyApprovalThreshold ?? 0,
        machineCertAlertDays: appSettings.machineCertAlertDays ?? 30,
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

      <div className="row">
        {/* ===== CỘT TRÁI ===== */}
        <div className="col-lg-6">
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

        </div>{/* /CỘT TRÁI */}

        {/* ===== CỘT PHẢI ===== */}
        <div className="col-lg-6">
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
                  <input type="number" min={0} max={100} step={0.1} className="form-control" value={payroll.cuttingRatePct}
                    onChange={(e) => setPayroll((p) => ({ ...p, cuttingRatePct: +e.target.value }))} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted">% Tổ Hoàn thành</label>
                <div className="input-group">
                  <input type="number" min={0} max={100} step={0.1} className="form-control" value={payroll.finishingRatePct}
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

        {/* Cấu hình in tem QR máy móc */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="d-flex align-items-center gap-2">
              <i className="fe fe-printer text-primary"></i>
              <h6 className="card-title mb-0">Cấu hình in tem QR máy móc</h6>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Đặt tên máy in tem (đặt máy này làm máy in mặc định của máy tính để in trực tiếp) và khổ tem.
            </p>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label small text-muted">Tên máy in tem QR</label>
              <input type="text" className="form-control" placeholder="VD: Xprinter XP-365B"
                value={qr.qrPrinterName}
                onChange={(e) => setQr((p) => ({ ...p, qrPrinterName: e.target.value }))} />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small text-muted">Rộng tem (mm)</label>
                <input type="number" min={10} max={300} className="form-control" value={qr.qrLabelWidthMm}
                  onChange={(e) => setQr((p) => ({ ...p, qrLabelWidthMm: +e.target.value }))} />
              </div>
              <div className="col-6">
                <label className="form-label small text-muted">Cao tem (mm)</label>
                <input type="number" min={10} max={300} className="form-control" value={qr.qrLabelHeightMm}
                  onChange={(e) => setQr((p) => ({ ...p, qrLabelHeightMm: +e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={updateSettings.isPending}
              onClick={() => updateSettings.mutate(qr)}>
              {updateSettings.isPending ? 'Đang lưu...' : 'Lưu cấu hình in QR'}
            </button>
            <div className="alert alert-info d-flex gap-2 mt-3 mb-0">
              <i className="fe fe-info flex-shrink-0 mt-1"></i>
              <p className="small mb-0">
                Trình duyệt in qua hộp thoại in của hệ điều hành và dùng máy in mặc định. Để in thẳng ra máy in tem,
                hãy đặt máy in tem ở trên làm <strong>máy in mặc định</strong> của máy tính.
              </p>
            </div>
          </div>
        </div>

        {/* Cấu hình phân hệ máy móc thiết bị */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="d-flex align-items-center gap-2">
              <i className="fe fe-hard-drive text-primary"></i>
              <h6 className="card-title mb-0">Phân hệ máy móc thiết bị</h6>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Ngưỡng duyệt 2 cấp và thời điểm cảnh báo hạn chứng chỉ, kiểm định.
            </p>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label small text-muted">Ngưỡng chi phí phải trình công ty duyệt (đ)</label>
              <input
                type="number" min={0} step={100000} className="form-control"
                value={machine.machineCompanyApprovalThreshold}
                onChange={(e) => setMachine((p) => ({ ...p, machineCompanyApprovalThreshold: +e.target.value }))}
              />
              <div className="form-text small">
                Kế hoạch sửa chữa/bảo dưỡng và yêu cầu mua vật tư có giá trị <strong>từ mức này trở lên</strong> phải
                qua công ty duyệt sau khi giám đốc xưởng đã duyệt. Để <strong>0</strong> nghĩa là mọi hồ sơ đều duyệt 2 cấp.
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Báo trước hạn chứng chỉ / kiểm định (ngày)</label>
              <input
                type="number" min={1} max={365} className="form-control"
                value={machine.machineCertAlertDays}
                onChange={(e) => setMachine((p) => ({ ...p, machineCertAlertDays: +e.target.value }))}
              />
            </div>
            <button className="btn btn-primary btn-sm" disabled={updateSettings.isPending}
              onClick={() => updateSettings.mutate(machine)}>
              {updateSettings.isPending ? 'Đang lưu...' : 'Lưu cấu hình máy móc'}
            </button>
          </div>
        </div>
        </div>{/* /CỘT PHẢI */}

        {/* ===== Thông tin hệ thống (full-width) ===== */}
        <div className="col-12">
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
                    <dt className="col-sm-3 text-muted">{label}</dt>
                    <dd className="col-sm-9 fw-medium">{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
