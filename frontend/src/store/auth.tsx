import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@/types/api'
import { authService } from '@/services/auth.service'
import { config } from '@/config'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
  refreshUser: () => User | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(authService.getUser())
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await authService.login({ email, password })
      if (res.success && res.token) {
        localStorage.setItem(config.auth.tokenKey, res.token)
        localStorage.setItem(config.auth.userKey, JSON.stringify(res.user))
        setUser(res.user)
      }
    } finally { setIsLoading(false) }
  }, [])

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setIsLoading(true)
    try {
      const res = await authService.register({ email, password, fullName })
      if (res.success && res.token) {
        localStorage.setItem(config.auth.tokenKey, res.token)
        localStorage.setItem(config.auth.userKey, JSON.stringify(res.user))
        setUser(res.user)
      }
    } finally { setIsLoading(false) }
  }, [])

  const logout = useCallback(() => { authService.logout(); setUser(null) }, [])

  const refreshUser = useCallback(() => {
    const u = authService.getUser()
    setUser(u)
    return u
  }, [])

  const value = useMemo(() => ({ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshUser }), [user, isLoading, login, register, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
