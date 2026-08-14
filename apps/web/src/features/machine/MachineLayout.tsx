import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const MachinesPage = lazy(() => import('./MachinesPage'))
const MaintenancePage = lazy(() => import('./MaintenancePage'))
const TransferPage = lazy(() => import('./TransferPage'))
const MachineHistoryPage = lazy(() => import('./MachineHistoryPage'))
const MachineDetailPage = lazy(() => import('./MachineDetailPage'))
const LiquidationPage = lazy(() => import('./LiquidationPage'))
const BrandsPage = lazy(() => import('./BrandsPage'))
const CategoriesPage = lazy(() => import('./CategoriesPage'))
const SparePartsPage = lazy(() => import('./SparePartsPage'))
const RepairProposalsPage = lazy(() => import('./RepairProposalsPage'))
const HandoverPage = lazy(() => import('./HandoverPage'))
const CertificatesPage = lazy(() => import('./CertificatesPage'))
const MaintenanceNormsPage = lazy(() => import('./MaintenanceNormsPage'))
const BreakdownReportsPage = lazy(() => import('./BreakdownReportsPage'))
const IncidentReportsPage = lazy(() => import('./IncidentReportsPage'))
const WorkOrdersPage = lazy(() => import('./WorkOrdersPage'))
const MaintenanceRequestsPage = lazy(() => import('./MaintenanceRequestsPage'))
const MaintenanceForecastPage = lazy(() => import('./MaintenanceForecastPage'))
const WorkPlansPage = lazy(() => import('./WorkPlansPage'))
const StockPage = lazy(() => import('./StockPage'))
const PartRequestsPage = lazy(() => import('./PartRequestsPage'))
const MachineStatisticsPage = lazy(() => import('./MachineStatisticsPage'))

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
            <Route path="repairs" element={<RepairProposalsPage />} />
            <Route path="handovers" element={<HandoverPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="norms" element={<MaintenanceNormsPage />} />
            <Route path="breakdowns" element={<BreakdownReportsPage />} />
            <Route path="incidents" element={<IncidentReportsPage />} />
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="repair-orders" element={<WorkOrdersPage defaultType="REPAIR" />} />
            <Route path="maintenance-orders" element={<WorkOrdersPage defaultType="MAINTENANCE" />} />
            <Route path="maintenance-requests" element={<MaintenanceRequestsPage />} />
            <Route path="maintenance-forecast" element={<MaintenanceForecastPage />} />
            <Route path="plans" element={<WorkPlansPage />} />
            <Route path="maintenance-plans" element={<WorkPlansPage defaultType="MAINTENANCE" />} />
            <Route path="repair-plans" element={<WorkPlansPage defaultType="REPAIR" />} />
            <Route path="stocks" element={<StockPage />} />
            <Route path="part-requests" element={<PartRequestsPage />} />
            <Route path="statistics" element={<MachineStatisticsPage />} />
            <Route path="liquidation" element={<LiquidationPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="spare-parts" element={<SparePartsPage />} />
            <Route path=":id" element={<MachineDetailPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
