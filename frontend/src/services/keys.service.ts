import apiClient from '@/api/client'
import type { UserApiKey, ApiKeyTestResult, ApiKeysStatus } from '@/types/api'

export const keysService = {
  async getKeysStatus() {
    const res = await apiClient.get<{ success: boolean; data: ApiKeysStatus }>('/keys/status')
    return res.data
  },
  async getKeys() {
    const res = await apiClient.get<{ success: boolean; data: UserApiKey[] }>('/keys')
    return res.data
  },
  async saveKey(provider: string, key: string) {
    const res = await apiClient.post<{ success: boolean; data: UserApiKey[] }>('/keys', { provider, key })
    return res.data
  },
  async deleteKey(provider: string) {
    const res = await apiClient.delete<{ success: boolean; data: UserApiKey[] }>(`/keys/${provider}`)
    return res.data
  },
  async testKey(provider: string) {
    const res = await apiClient.post<{ success: boolean; data: ApiKeyTestResult }>('/keys/test', { provider })
    return res.data
  },
}
