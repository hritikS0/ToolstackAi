import apiClient from '@/api/client'
import { config } from '@/config'
import type { User } from '@/types/api'

export const authService = {
  async login(data: { email: string; password: string }) {
    const res = await apiClient.post<{ success: boolean; token: string; user: User }>('/auth/login', data)
    return res.data
  },
  async register(data: { email: string; password: string; fullName: string }) {
    const res = await apiClient.post<{ success: boolean; token: string; user: User; welcomeConversationId?: string | null }>('/auth/register', data)
    return res.data
  },
  logout() {
    localStorage.removeItem(config.auth.tokenKey)
    localStorage.removeItem(config.auth.userKey)
    window.location.href = config.auth.loginPath
  },
  getToken() { return localStorage.getItem(config.auth.tokenKey) },
  getUser(): User | null {
    const u = localStorage.getItem(config.auth.userKey)
    return u ? JSON.parse(u) : null
  },
  isAuthenticated() { return !!localStorage.getItem(config.auth.tokenKey) },
}
