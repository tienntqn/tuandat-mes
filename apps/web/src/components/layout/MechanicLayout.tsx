import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { LoadingScreen } from './LoadingScreen'
import { useAuthStore } from '@/stores/auth.store'

const MechanicDashboard = lazy(() => import('@/features/machine/MechanicDashboard'))
const MachineLayout = lazy(() => import('@/features/machine/MachineLayout'))

const TABS = [
  { label: 'Dashboard', path: '/', icon: 'fe fe-home', end: true },
  { label: 'Máy', path: '/machines', icon: 'fe fe-hard-drive', end: true },
  { label: 'Bảo dưỡng', path: '/machines/maintenance', icon: 'fe fe-tool', end: false },
  { label: 'Đề xuất sửa chữa', path: '/machines/repairs', icon: 'fe fe-clipboard', end: false },
  { label: 'Điều chuyển', path: '/machines/transfers', icon: 'fe fe-repeat', end: false },
  { label: 'Phụ tùng', path: '/machines/spare-parts', icon: 'fe fe-package', end: false },
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
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small">{user?.fullName ?? user?.username}</span>
          <button className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1" onClick={logout}>
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Thanh tab ngang thay cho sidebar */}
      <div className="bg-white border-bottom px-3 py-2" style={{ position: 'sticky', top: 44, zIndex: 19 }}>
        <div className="section-tabs" style={{ margin: 0 }}>
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
