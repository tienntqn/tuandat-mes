import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from './LoadingScreen'
import { useMe } from '@/features/auth/auth.hooks'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
  permissions?: string[]
  /** Nếu true, chuyển về /403 khi không có quyền thay vì /login */
  forbiddenRedirect?: boolean
}

export function ProtectedRoute({
  children,
  roles,
  permissions,
  forbiddenRedirect = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, hasRole, hasPermission, isAdmin } = useAuthStore()
  const location = useLocation()
  const { isLoading } = useMe()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isLoading && !user) return <LoadingScreen />

  // Kiểm tra roles
  if (roles && roles.length > 0 && !isAdmin()) {
    const ok = roles.some((r) => hasRole(r))
    if (!ok) return forbiddenRedirect ? <Navigate to="/403" replace /> : null
  }

  // Kiểm tra permissions
  if (permissions && permissions.length > 0 && !isAdmin()) {
    const ok = permissions.every((p) => hasPermission(p))
    if (!ok) return forbiddenRedirect ? <Navigate to="/403" replace /> : null
  }

  return <>{children}</>
}
