import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { config as appConfig } from '@/config'

const apiClient = axios.create({
  baseURL: appConfig.api.baseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: appConfig.api.timeout,
})

apiClient.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(appConfig.auth.tokenKey)
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
}, (error: AxiosError) => Promise.reject(error))

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register')
    const isAlreadyOnLogin = typeof window !== 'undefined' && window.location.pathname === appConfig.auth.loginPath

    if (error.response?.status === 401 && !isAuthRoute && !isAlreadyOnLogin) {
      localStorage.removeItem(appConfig.auth.tokenKey)
      localStorage.removeItem(appConfig.auth.userKey)
      window.location.href = appConfig.auth.loginPath
    }
    return Promise.reject(error)
  },
)

export default apiClient
