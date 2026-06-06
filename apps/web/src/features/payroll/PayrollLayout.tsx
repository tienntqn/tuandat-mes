import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const PayrollLinePage = lazy(() => import('./PayrollLinePage'))
const PayrollSectionPage = lazy(() => import('./PayrollSectionPage'))

export default function PayrollLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<PayrollLinePage />} />
        <Route path="lines" element={<PayrollLinePage />} />
        <Route path="sections" element={<PayrollSectionPage />} />
      </Routes>
    </Suspense>
  )
}
