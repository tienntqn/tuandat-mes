import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { LoadingScreen } from './LoadingScreen'
import { useAuthStore } from '@/stores/auth.store'

const OutputLayout = lazy(() => import('@/features/output/OutputLayout'))

/**
 * Giao diện tối giản cho Tổ trưởng / Tổ phó: ẩn toàn bộ sidebar, chỉ còn trang
 * nhập sản lượng của chuyền mình (mã hàng đã được backend lọc theo chuyền).
 */
export default function ShopFloorLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      <header
        className="d-flex align-items-center justify-content-between px-3 py-2 bg-white border-bottom"
        style={{ position: 'sticky', top: 0, zIndex: 10 }}
      >
        <span style={{ fontWeight: 700, color: '#6259ca' }}>Tuấn Đạt MES — Nhập sản lượng</span>
        <div className="d-flex align-items-center gap-2 gap-md-3">
          <span className="text-muted small d-none d-sm-inline">{user?.fullName ?? user?.username}</span>
          <button className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1" onClick={logout}>
            <LogOut size={14} /> <span className="d-none d-sm-inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <main className="side-app" style={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/output/*" element={<OutputLayout />} />
            <Route path="*" element={<Navigate to="/output" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
