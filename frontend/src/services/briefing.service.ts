import apiClient from '@/api/client'
import type { BriefingData } from '@/types/api'

export const briefingService = {
  async get() {
    const res = await apiClient.get<{ success: boolean; data: BriefingData }>('/briefing')
    return res.data
  },
}
