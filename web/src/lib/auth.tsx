import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGetCurrentUser } from '#/api/auth/auth'
import type { User } from '#/api/model'

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useGetCurrentUser({
    query: { retry: false, staleTime: 5 * 60 * 1000 },
  })

  const user = data?.status === 200 ? data.data : null

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: user !== null }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

/**
 * Auth state for protected pages. Redirects to `/auth/login` once the user is
 * confirmed to be logged out, preserving the current location so the user can
 * be sent back after logging in.
 */
export function useRequireAuth() {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      navigate({
        to: '/auth/login',
        replace: true,
      })
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate, location.href])

  return auth
}
