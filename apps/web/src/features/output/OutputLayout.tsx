import { Suspense, lazy } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { ClipboardList, History } from 'lucide-react'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import { cn } from '@/lib/utils'

const OutputPage = lazy(() => import('./OutputPage'))
const OutputHistoryPage = lazy(() => import('./OutputHistoryPage'))

const TAB_ITEMS = [
  { label: 'Nhập hôm nay', path: '/output', icon: ClipboardList, end: true },
  { label: 'Lịch sử', path: '/output/history', icon: History, end: false },
]

export default function OutputLayout() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — bottom nav style cho mobile */}
      <div className="border-b bg-background">
        <nav className="flex max-w-lg mx-auto">
          {TAB_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors border-b-2',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : '')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route index element={<OutputPage />} />
            <Route path="history" element={<OutputHistoryPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
