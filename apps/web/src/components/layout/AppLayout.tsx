import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoadingScreen } from './LoadingScreen'

// Lazy load từng feature module
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar sẽ implement ở Giai đoạn 3+ */}
      <aside className="w-64 border-r bg-card hidden lg:block">
        <div className="p-4 font-bold text-primary text-lg">Tuấn Đạt MES</div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Các route sẽ bổ sung theo từng giai đoạn */}
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
