import { Suspense, lazy, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useAuthStore } from '@/stores/auth.store'

// Danh mục
const CustomersPage = lazy(() => import('@/features/customer/CustomersPage'))
const StylesPage = lazy(() => import('@/features/style/StylesPage'))
const ColorsPage = lazy(() => import('@/features/color/ColorsPage'))
const SizesPage = lazy(() => import('@/features/size/SizesPage'))
// Đơn hàng
const OrdersPage = lazy(() => import('@/features/order/OrdersPage'))
const PurchaseOrdersPage = lazy(() => import('@/features/purchase-order/PurchaseOrdersPage'))
// Kế hoạch sản xuất
const CompanyPlanPage = lazy(() => import('@/features/plan/CompanyPlanPage'))
const PlanByPoPage = lazy(() => import('@/features/plan/PlanByPoPage'))
const FactoryPlanPage = lazy(() => import('@/features/plan/FactoryPlanPage'))
const DeliveryPlansPage = lazy(() => import('@/features/delivery-plan/DeliveryPlansPage'))
// Theo dõi tiến độ
const CuttingProgressPage = lazy(() => import('@/features/progress/CuttingProgressPage'))
const SewingProgressPage = lazy(() => import('@/features/progress/SewingProgressPage'))
const FinishingProgressPage = lazy(() => import('@/features/progress/FinishingProgressPage'))
const ShippingProgressPage = lazy(() => import('@/features/progress/ShippingProgressPage'))
const SohoConverterPage = lazy(() => import('@/features/planning/SohoConverterPage'))
const ContainerLoadingPage = lazy(() => import('@/features/planning/container-loading/ContainerLoadingPage'))
// Báo cáo
const ReportPage = lazy(() => import('@/features/report/ReportPage'))

// RBAC theo từng mục con (đồng bộ với Sidebar)
const R_COMPANY = ['ADMIN', 'BOD', 'COMPANY_PLANNER']
const R_FACTORY_PLAN = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']
const R_DELIVERY = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_PLANNER']
const R_PROGRESS = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']
const R_REPORT = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER']

const guard = (roles: string[], el: ReactNode) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>

// Trang mặc định theo role: cấp công ty vào "Đơn đặt hàng", còn lại vào "Tiến độ may".
function PlanningIndex() {
  const { isAdmin, hasRole } = useAuthStore()
  const company = isAdmin() || hasRole('BOD') || hasRole('COMPANY_PLANNER')
  return <Navigate to={company ? 'orders' : 'progress/sewing'} replace />
}

export default function PlanningLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<PlanningIndex />} />
        {/* Danh mục */}
        <Route path="customers" element={guard(R_COMPANY, <CustomersPage />)} />
        <Route path="styles" element={guard(R_COMPANY, <StylesPage />)} />
        <Route path="colors" element={guard(R_COMPANY, <ColorsPage />)} />
        <Route path="sizes" element={guard(R_COMPANY, <SizesPage />)} />
        {/* Đơn hàng */}
        <Route path="orders" element={guard(R_COMPANY, <OrdersPage />)} />
        <Route path="purchase-orders" element={guard(R_COMPANY, <PurchaseOrdersPage />)} />
        {/* Kế hoạch sản xuất */}
        <Route path="plans/company" element={guard(R_COMPANY, <CompanyPlanPage />)} />
        <Route path="plans/by-po" element={guard(R_COMPANY, <PlanByPoPage />)} />
        <Route path="plans/factory" element={guard(R_FACTORY_PLAN, <FactoryPlanPage />)} />
        <Route path="delivery" element={guard(R_DELIVERY, <DeliveryPlansPage />)} />
        {/* Theo dõi tiến độ */}
        <Route path="progress/cutting" element={guard(R_PROGRESS, <CuttingProgressPage />)} />
        <Route path="progress/sewing" element={guard(R_PROGRESS, <SewingProgressPage />)} />
        <Route path="progress/finishing" element={guard(R_PROGRESS, <FinishingProgressPage />)} />
        <Route path="progress/shipping" element={guard(R_PROGRESS, <ShippingProgressPage />)} />
        <Route path="soho-converter" element={guard(R_FACTORY_PLAN, <SohoConverterPage />)} />
        <Route path="container-loading" element={guard(R_FACTORY_PLAN, <ContainerLoadingPage />)} />
        {/* Báo cáo */}
        <Route path="reports" element={guard(R_REPORT, <ReportPage />)} />
      </Routes>
    </Suspense>
  )
}
