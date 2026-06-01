import apiClient from '@/api/client'
import type { DashboardData } from '@/types/api'

export const dashboardService = {
  async get() {
    const res = await apiClient.get<{ success: boolean; data: DashboardData }>('/dashboard')
    return res.data
  },
}
