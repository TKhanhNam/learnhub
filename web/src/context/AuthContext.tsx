import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface AuthUser {
  id: number
  username: string
  fullName: string
  role: string
  emailVerified?: boolean
}

interface TokenPayload {
  userId: number
  username: string
  fullName: string
  role: string
  accessToken: string
  refreshToken: string
  emailVerified?: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  login: (data: TokenPayload) => void
  markEmailVerified: () => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('lh_user')
    const token = localStorage.getItem('lh_token')
    if (raw && token) return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readUser())

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    login: (data) => {
      localStorage.setItem('lh_token', data.accessToken)
      localStorage.setItem('lh_refresh', data.refreshToken)
      const authUser: AuthUser = {
        id: data.userId,
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        emailVerified: data.emailVerified !== false,
      }
      localStorage.setItem('lh_user', JSON.stringify(authUser))
      setUser(authUser)
    },
    markEmailVerified: () => {
      setUser((current) => {
        if (!current) return current
        const next = { ...current, emailVerified: true }
        localStorage.setItem('lh_user', JSON.stringify(next))
        return next
      })
    },
    logout: () => {
      localStorage.removeItem('lh_token')
      localStorage.removeItem('lh_refresh')
      localStorage.removeItem('lh_user')
      setUser(null)
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
