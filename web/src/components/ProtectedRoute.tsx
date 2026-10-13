import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({
  children,
  roles,
  requireVerified,
}: {
  children: ReactNode
  roles?: string[]
  requireVerified?: boolean
}) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireVerified && user?.emailVerified === false) return <Navigate to="/verify-email" replace />
  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
