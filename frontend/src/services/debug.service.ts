import apiClient from '@/api/client'
import type { DebugResult } from '@/types/api'

export const debugService = {
  async analyzeCode(code: string, language: string) {
    const res = await apiClient.post<{ success: boolean; data: DebugResult }>('/debug', { code, language })
    return res.data
  },
}
