import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const MachinesPage = lazy(() => import('./MachinesPage'))
const MaintenancePage = lazy(() => import('./MaintenancePage'))
const TransferPage = lazy(() => import('./TransferPage'))
const MachineHistoryPage = lazy(() => import('./MachineHistoryPage'))

// Các trang con được điều hướng từ menu "Quản lý máy móc" ở sidebar.
export default function MachineLayout() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route index element={<MachinesPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="transfers" element={<TransferPage />} />
            <Route path="history" element={<MachineHistoryPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
