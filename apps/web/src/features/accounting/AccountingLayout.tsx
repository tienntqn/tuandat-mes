import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const SalaryPeriodsPage = lazy(() => import('./SalaryPeriodsPage'))
const SalaryPeriodDetailPage = lazy(() => import('./SalaryPeriodDetailPage'))

export default function AccountingLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<SalaryPeriodsPage />} />
        <Route path=":id" element={<SalaryPeriodDetailPage />} />
      </Routes>
    </Suspense>
  )
}
