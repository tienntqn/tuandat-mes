import { Suspense, lazy, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { LoadingScreen } from './LoadingScreen'
import { ProtectedRoute } from './ProtectedRoute'

// Lazy-load các trang
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const ForbiddenPage = lazy(() => import('./ForbiddenPage'))
const NotFoundPage = lazy(() => import('./NotFoundPage'))

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50">
            <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <main className="flex-1 overflow-auto">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/users/*"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              {/* Các module sẽ bổ sung ở Giai đoạn 3–7 */}
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
