import { Suspense, lazy } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Building2, Factory, GitBranch, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const CompanyPage = lazy(() => import('@/features/company/CompanyPage'))
const FactoriesPage = lazy(() => import('@/features/factory/FactoriesPage'))
const LinesPage = lazy(() => import('@/features/production-line/LinesPage'))
const EmployeesPage = lazy(() => import('@/features/employee/EmployeesPage'))
const CustomersPage = lazy(() => import('@/features/customer/CustomersPage'))
const StylesPage = lazy(() => import('@/features/style/StylesPage'))
const PurchaseOrdersPage = lazy(() => import('@/features/purchase-order/PurchaseOrdersPage'))

interface NavTab {
  label: string
  path: string
  icon: React.ElementType
  roles?: string[]
}

// Khách hàng / Mã hàng / Purchase Orders đã chuyển sang "Phân hệ Kế hoạch".
// Dữ liệu nền chỉ còn dữ liệu tổ chức/nhân sự.
const TABS: NavTab[] = [
  { label: 'Công ty', path: 'company', icon: Building2, roles: ['ADMIN'] },
  { label: 'Xưởng', path: 'factories', icon: Factory },
  { label: 'Chuyền', path: 'lines', icon: GitBranch },
  { label: 'Nhân viên', path: 'employees', icon: Users },
]

export default function MasterLayout() {
  const { isAdmin, hasRole } = useAuthStore()

  const visibleTabs = TABS.filter((t) => {
    if (!t.roles) return true
    if (isAdmin()) return true
    return t.roles.some((r) => hasRole(r))
  })

  return (
    <div className="flex flex-col h-full">
      {/* Secondary nav */}
      <div className="border-b bg-background px-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )
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
            <Route index element={<Navigate to={visibleTabs[0]?.path ?? 'company'} replace />} />
            <Route path="company" element={<CompanyPage />} />
            <Route path="factories" element={<FactoriesPage />} />
            <Route path="lines" element={<LinesPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="styles" element={<StylesPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
