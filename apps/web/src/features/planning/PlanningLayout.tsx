import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

// Danh mục
const CustomersPage = lazy(() => import('@/features/customer/CustomersPage'))
const StylesPage = lazy(() => import('@/features/style/StylesPage'))
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
// Báo cáo
const ReportPage = lazy(() => import('@/features/report/ReportPage'))

export default function PlanningLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<Navigate to="orders" replace />} />
        {/* Danh mục */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="styles" element={<StylesPage />} />
        {/* Đơn hàng */}
        <Route path="orders" element={<OrdersPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        {/* Kế hoạch sản xuất */}
        <Route path="plans/company" element={<CompanyPlanPage />} />
        <Route path="plans/by-po" element={<PlanByPoPage />} />
        <Route path="plans/factory" element={<FactoryPlanPage />} />
        <Route path="delivery" element={<DeliveryPlansPage />} />
        {/* Theo dõi tiến độ */}
        <Route path="progress/cutting" element={<CuttingProgressPage />} />
        <Route path="progress/sewing" element={<SewingProgressPage />} />
        <Route path="progress/finishing" element={<FinishingProgressPage />} />
        <Route path="progress/shipping" element={<ShippingProgressPage />} />
        {/* Báo cáo */}
        <Route path="reports" element={<ReportPage />} />
      </Routes>
    </Suspense>
  )
}
