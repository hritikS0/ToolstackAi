import apiClient from '@/api/client'
import type { Task } from '@/types/api'

interface TaskQuery {
  status?: string
  priority?: string
  projectId?: string
}

export const tasksService = {
  async list(params?: TaskQuery) {
    const res = await apiClient.get<{ success: boolean; data: Task[] }>('/tasks', { params })
    return res.data
  },
  async getById(id: string) {
    const res = await apiClient.get<{ success: boolean; data: Task }>(`/tasks/${id}`)
    return res.data
  },
  async create(data: Partial<Task>) {
    const res = await apiClient.post<{ success: boolean; data: Task }>('/tasks', data)
    return res.data
  },
  async update(id: string, data: Partial<Task>) {
    const res = await apiClient.patch<{ success: boolean; data: Task }>(`/tasks/${id}`, data)
    return res.data
  },
  async delete(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/tasks/${id}`)
    return res.data
  },
  async aiCreate(message: string) {
    const res = await apiClient.post<{ success: boolean; data: Task }>('/tasks/ai-create', { message })
    return res.data
  },
  async aiSuggestions() {
    const res = await apiClient.get<{ success: boolean; data: Task[] }>('/tasks/ai-suggestions')
    return res.data
  },
}
