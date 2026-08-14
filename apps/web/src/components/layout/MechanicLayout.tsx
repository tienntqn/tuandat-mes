import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { LoadingScreen } from './LoadingScreen'
import { useAuthStore } from '@/stores/auth.store'
import { ScanMachineButton } from '@/features/machine/ScanMachineButton'

const MechanicDashboard = lazy(() => import('@/features/machine/MechanicDashboard'))
const MachineLayout = lazy(() => import('@/features/machine/MachineLayout'))

const TABS = [
  { label: 'Dashboard', path: '/', icon: 'fe fe-home', end: true },
  { label: 'Máy', path: '/machines', icon: 'fe fe-hard-drive', end: true },
  { label: 'Báo hỏng', path: '/machines/breakdowns', icon: 'fe fe-alert-octagon', end: false },
  { label: 'Phiếu sửa chữa', path: '/machines/repair-orders', icon: 'fe fe-tool', end: false },
  { label: 'Dự tính BD', path: '/machines/maintenance-forecast', icon: 'fe fe-trending-up', end: false },
  { label: 'Yêu cầu BD', path: '/machines/maintenance-requests', icon: 'fe fe-inbox', end: false },
  { label: 'Kế hoạch BD', path: '/machines/maintenance-plans', icon: 'fe fe-calendar', end: false },
  { label: 'Phiếu bảo dưỡng', path: '/machines/maintenance-orders', icon: 'fe fe-settings', end: false },
  { label: 'Bàn giao', path: '/machines/handovers', icon: 'fe fe-file-text', end: false },
  { label: 'Sự cố', path: '/machines/incidents', icon: 'fe fe-alert-triangle', end: false },
  { label: 'Chứng chỉ', path: '/machines/certificates', icon: 'fe fe-shield', end: false },
  { label: 'Định mức BD', path: '/machines/norms', icon: 'fe fe-sliders', end: false },
  { label: 'Lịch sử BD', path: '/machines/maintenance', icon: 'fe fe-clock', end: false },
  { label: 'Đề xuất sửa chữa', path: '/machines/repairs', icon: 'fe fe-clipboard', end: false },
  { label: 'Điều chuyển', path: '/machines/transfers', icon: 'fe fe-repeat', end: false },
  { label: 'Lịch sử điều chuyển', path: '/machines/history', icon: 'fe fe-clock', end: false },
  { label: 'Phụ tùng', path: '/machines/spare-parts', icon: 'fe fe-package', end: false },
  { label: 'Tồn kho', path: '/machines/stocks', icon: 'fe fe-database', end: false },
  { label: 'Mua vật tư', path: '/machines/part-requests', icon: 'fe fe-shopping-cart', end: false },
  { label: 'Thống kê', path: '/machines/statistics', icon: 'fe fe-bar-chart-2', end: false },
]

/**
 * Giao diện tối giản cho Cơ điện: ẩn sidebar, chỉ còn thanh tab phân hệ Quản lý máy
 * móc của xưởng mình (dữ liệu đã được backend lọc theo xưởng qua dataScope).
 */
export default function MechanicLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      <header
        className="d-flex align-items-center justify-content-between px-3 py-2 bg-white border-bottom"
        style={{ position: 'sticky', top: 0, zIndex: 20 }}
      >
        <span style={{ fontWeight: 700, color: '#6259ca' }}>Tuấn Đạt MES — Cơ điện</span>
        <div className="d-flex align-items-center gap-2 gap-md-3">
          <ScanMachineButton />
          <span className="text-muted small d-none d-sm-inline">{user?.fullName ?? user?.username}</span>
          <button className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1" onClick={logout}>
            <LogOut size={14} /> <span className="d-none d-sm-inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Thanh tab ngang thay cho sidebar — tự xuống dòng khi quá rộng */}
      <div className="bg-white border-bottom px-3 pt-3 pb-2" style={{ position: 'sticky', top: 44, zIndex: 19 }}>
        <div className="section-tabs mechanic-tabs" style={{ margin: 0 }}>
          {TABS.map((t) => (
            <NavLink
              key={t.path}
              to={t.path}
              end={t.end}
              className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}
            >
              <i className={t.icon}></i>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <main className="side-app" style={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<MechanicDashboard />} />
            <Route path="/machines/*" element={<MachineLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
