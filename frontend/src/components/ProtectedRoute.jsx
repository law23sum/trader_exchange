import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function ProtectedTraderRoute({ children }){
  const { user, role, loading } = useAuth()
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  return role === 'TRADER' ? children : <Navigate to="/dashboard/user" replace />
}

export function ProtectedUserRoute({ children }){
  const { user, role, loading } = useAuth()
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  return role !== 'TRADER' ? children : <Navigate to="/dashboard/trader" replace />
}

export function ProtectedAdminRoute({ children }){
  const { user, role, loading } = useAuth()
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  return role === 'ADMIN' ? children : <Navigate to="/dashboard/user" replace />
}

export function RequireAuth({ children }){
  const { user, loading } = useAuth()
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  return user ? children : <Navigate to="/signin" replace />
}
