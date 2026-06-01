import apiClient from '@/api/client'
import type { Memory, BrainSettings, BrainDashboard } from '@/types/api'

interface MemoryQuery {
  search?: string
  category?: string
  sort?: 'newest' | 'oldest' | 'importance'
  pinned?: boolean
}

export const brainService = {
  async getDashboard() {
    const res = await apiClient.get<{ success: boolean; data: BrainDashboard }>('/brain/dashboard')
    return res.data
  },
  async getMemories(params?: MemoryQuery) {
    const res = await apiClient.get<{ success: boolean; data: Memory[] }>('/brain/memories', { params })
    return res.data
  },
  async getMemory(id: string) {
    const res = await apiClient.get<{ success: boolean; data: Memory }>(`/brain/memories/${id}`)
    return res.data
  },
  async createMemory(data: { title: string; content: string; category: string; importance?: number; confidence?: number; source?: string }) {
    const res = await apiClient.post<{ success: boolean; data: Memory }>('/brain/memories', data)
    return res.data
  },
  async updateMemory(id: string, data: Partial<Memory>) {
    const res = await apiClient.patch<{ success: boolean; data: Memory }>(`/brain/memories/${id}`, data)
    return res.data
  },
  async deleteMemory(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/brain/memories/${id}`)
    return res.data
  },
  async getSettings() {
    const res = await apiClient.get<{ success: boolean; data: BrainSettings }>('/brain/settings')
    return res.data
  },
  async updateSettings(data: Partial<BrainSettings>) {
    const res = await apiClient.patch<{ success: boolean; data: BrainSettings }>('/brain/settings', data)
    return res.data
  },
  async deleteAllMemories() {
    const res = await apiClient.delete<{ success: boolean }>('/brain/memories')
    return res.data
  },
}
