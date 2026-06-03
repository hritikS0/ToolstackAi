import apiClient from '@/api/client'
import type { Habit, HabitStats } from '@/types/api'

interface CreateHabitData {
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  targetCount?: string
  projectId?: string
}

interface UpdateHabitData {
  title?: string
  description?: string
  frequency?: 'daily' | 'weekly' | 'monthly'
  targetCount?: string
  active?: boolean
  projectId?: string | null
}

export const habitsService = {
  async list(projectId?: string) {
    const res = await apiClient.get<{ success: boolean; data: Habit[] }>('/habits', {
      params: projectId ? { projectId } : undefined,
    })
    return res.data
  },

  async getStats(id: string) {
    const res = await apiClient.get<{ success: boolean; data: HabitStats }>(`/habits/${id}/stats`)
    return res.data
  },

  async create(data: CreateHabitData) {
    const res = await apiClient.post<{ success: boolean; data: Habit }>('/habits', data)
    return res.data
  },

  async update(id: string, data: UpdateHabitData) {
    const res = await apiClient.patch<{ success: boolean; data: Habit }>(`/habits/${id}`, data)
    return res.data
  },

  async delete(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/habits/${id}`)
    return res.data
  },

  async complete(id: string) {
    const res = await apiClient.post<{ success: boolean; data: Habit }>(`/habits/${id}/complete`)
    return res.data
  },

  async aiCreate(message: string) {
    const res = await apiClient.post<{ success: boolean; data: Habit[] }>('/habits/ai-create', { message })
    return res.data
  },

  async aiInsights() {
    const res = await apiClient.get<{ success: boolean; data: string }>('/habits/ai-insights')
    return res.data
  },
}
