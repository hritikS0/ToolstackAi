import apiClient from '@/api/client'
import type { Goal, Milestone } from '@/types/api'

interface GoalQuery {
  status?: string
  projectId?: string
}

interface CreateGoalData {
  title: string
  description?: string
  targetDate?: string
  projectId?: string
}

interface CreateMilestoneData {
  title: string
  description?: string
  order?: number
}

export const goalsService = {
  async list(params?: GoalQuery) {
    const res = await apiClient.get<{ success: boolean; data: Goal[] }>('/goals', { params })
    return res.data
  },
  async getById(id: string) {
    const res = await apiClient.get<{ success: boolean; data: Goal }>(`/goals/${id}`)
    return res.data
  },
  async create(data: CreateGoalData) {
    const res = await apiClient.post<{ success: boolean; data: Goal }>('/goals', data)
    return res.data
  },
  async update(id: string, data: Partial<Goal>) {
    const res = await apiClient.patch<{ success: boolean; data: Goal }>(`/goals/${id}`, data)
    return res.data
  },
  async delete(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/goals/${id}`)
    return res.data
  },
  async addMilestone(goalId: string, data: CreateMilestoneData) {
    const res = await apiClient.post<{ success: boolean; data: Milestone }>(`/goals/${goalId}/milestones`, data)
    return res.data
  },
  async updateMilestone(goalId: string, milestoneId: string, data: Partial<Milestone>) {
    const res = await apiClient.patch<{ success: boolean; data: Milestone }>(`/goals/${goalId}/milestones/${milestoneId}`, data)
    return res.data
  },
  async deleteMilestone(goalId: string, milestoneId: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/goals/${goalId}/milestones/${milestoneId}`)
    return res.data
  },
  async aiSuggestMilestones(goalId: string) {
    const res = await apiClient.post<{ success: boolean; data: { suggestions: { title: string; description: string }[] } }>(`/goals/${goalId}/ai-milestones`)
    return res.data
  },
  async aiAnalyzeProgress(goalId: string) {
    const res = await apiClient.get<{ success: boolean; data: { analysis: string } }>(`/goals/${goalId}/ai-analysis`)
    return res.data
  },
}
