import { Suspense, lazy } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Building2, GitBranch } from 'lucide-react'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import { useAuthStore } from '@/stores/auth.store'

const CompanyPlanPage = lazy(() => import('./CompanyPlanPage'))
const FactoryPlanPage = lazy(() => import('./FactoryPlanPage'))

const tabs = [
  {
    to: 'company',
    label: 'Kế hoạch Công ty',
    icon: Building2,
    roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER'],
  },
  {
    to: 'factory',
    label: 'Kế hoạch Xưởng',
    icon: GitBranch,
    roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
  },
]

export default function PlanLayout() {
  const { hasRole, isAdmin } = useAuthStore()

  const visibleTabs = tabs.filter(
    (t) => isAdmin() || t.roles.some((r) => hasRole(r)),
  )

  const defaultTab = visibleTabs[0]?.to ?? 'factory'

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <div className="border-b bg-background px-6">
        <nav className="flex gap-1 -mb-px">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route index element={<Navigate to={defaultTab} replace />} />
            <Route path="company" element={<CompanyPlanPage />} />
            <Route path="factory" element={<FactoryPlanPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
