import { Suspense, lazy } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Wrench, Hammer, ArrowLeftRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const MachinesPage = lazy(() => import('./MachinesPage'))
const MaintenancePage = lazy(() => import('./MaintenancePage'))
const TransferPage = lazy(() => import('./TransferPage'))
const MachineHistoryPage = lazy(() => import('./MachineHistoryPage'))

const TABS = [
  { path: '', end: true, label: 'Danh sách máy', icon: Wrench },
  { path: 'maintenance', end: false, label: 'Bảo dưỡng', icon: Hammer },
  { path: 'transfers', end: false, label: 'Điều chuyển', icon: ArrowLeftRight },
  { path: 'history', end: false, label: 'Lịch sử di chuyển', icon: MapPin },
]

export default function MachineLayout() {
  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav tabs */}
      <div className="border-b bg-card px-6 flex gap-0 overflow-x-auto shrink-0">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Content */}
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
