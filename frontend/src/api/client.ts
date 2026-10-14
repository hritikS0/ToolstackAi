import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { config as appConfig } from '@/config'
import { triggerToast } from '@/components/ui/toast'

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
    } else if (!error.response && error.code === 'ERR_NETWORK') {
      triggerToast({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to the backend server. Please verify your connection or ensure the server is running.',
      })
    } else if (error.response && error.response.status >= 500) {
      const serverMsg = (error.response.data as any)?.message || 'An unexpected internal server error occurred.'
      triggerToast({
        type: 'error',
        title: `Server Error (${error.response.status})`,
        message: serverMsg,
      })
    }
    return Promise.reject(error)
  },
)

export default apiClient
