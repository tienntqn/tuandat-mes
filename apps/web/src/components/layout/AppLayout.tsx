import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { LoadingScreen } from './LoadingScreen'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '@/stores/auth.store'

const ShopFloorLayout = lazy(() => import('./ShopFloorLayout'))
const MechanicLayout = lazy(() => import('./MechanicLayout'))

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const FactoryManagementLayout = lazy(() => import('@/features/factory-management/FactoryManagementLayout'))
const CompanyPage = lazy(() => import('@/features/company/CompanyPage'))
const EmployeesPage = lazy(() => import('@/features/employee/EmployeesPage'))
const MachineLayout = lazy(() => import('@/features/machine/MachineLayout'))
const PlanLayout = lazy(() => import('@/features/plan/PlanLayout'))
const PlanningLayout = lazy(() => import('@/features/planning/PlanningLayout'))
const OutputLayout = lazy(() => import('@/features/output/OutputLayout'))
const ReportPage = lazy(() => import('@/features/report/ReportPage'))
const PayrollLayout = lazy(() => import('@/features/payroll/PayrollLayout'))
const AccountingLayout = lazy(() => import('@/features/accounting/AccountingLayout'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const ForbiddenPage = lazy(() => import('./ForbiddenPage'))
const NotFoundPage = lazy(() => import('./NotFoundPage'))

export default function AppLayout() {
  const { isShopFloor, isMechanic, isAdmin } = useAuthStore()

  // Cơ điện: ẩn sidebar, chỉ thấy phân hệ Quản lý máy móc của xưởng mình
  if (isMechanic() && !isAdmin()) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <MechanicLayout />
      </Suspense>
    )
  }

  // Tổ trưởng chuyền / Tổ Cắt / Tổ Hoàn thành / Tổ KCS: chỉ thấy trang nhập sản lượng, ẩn sidebar
  if (isShopFloor() && !isAdmin()) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ShopFloorLayout />
      </Suspense>
    )
  }

  return (
    <div className="page">
      <div className="page-main">
        <Topbar />
        <Sidebar />

        {/* APP-CONTENT */}
        <div className="app-content main-content">
          <div className="side-app">
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
                <Route
                  path="/factory-management/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'COMPANY_PLANNER']}>
                      <FactoryManagementLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD']}>
                      <EmployeesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/machines/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC']}>
                      <MachineLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/plans/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']}>
                      <PlanLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/planning/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']}>
                      <PlanningLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/output/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY', 'CUTTING_LEADER', 'FINISHING_LEADER', 'QC_LEADER']}>
                      <OutputLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER']}>
                      <ReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER']}>
                      <PayrollLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounting/*"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'BOD', 'ACCOUNTANT']}>
                      <AccountingLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/company"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <CompanyPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
        </div>
        {/* /APP-CONTENT */}
      </div>
    </div>
  )
}
