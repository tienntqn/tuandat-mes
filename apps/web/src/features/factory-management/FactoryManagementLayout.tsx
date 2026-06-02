import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/LoadingScreen'

const FactoriesPage = lazy(() => import('@/features/factory/FactoriesPage'))
const FactoryLinesPage = lazy(() => import('./FactoryLinesPage'))

export default function FactoryManagementLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<Navigate to="factories" replace />} />
        <Route path="factories" element={<FactoriesPage />} />
        <Route path="lines" element={<FactoryLinesPage />} />
      </Routes>
    </Suspense>
  )
}
