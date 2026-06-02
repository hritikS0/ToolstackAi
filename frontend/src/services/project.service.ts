import apiClient from '@/api/client'
import type { Project, Thread } from '@/types/api'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const res = await apiClient.get<ApiResponse<Project[]>>('/projects')
    return res.data.data
  },

  async getById(id: string): Promise<Project> {
    const res = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`)
    return res.data.data
  },

  async create(data: { name: string; description?: string; icon?: string; color?: string }): Promise<Project> {
    const res = await apiClient.post<ApiResponse<Project>>('/projects', data)
    return res.data.data
  },

  async update(id: string, data: { name?: string; description?: string; icon?: string; color?: string }): Promise<void> {
    await apiClient.patch(`/projects/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
  },

  async getThreads(projectId: string): Promise<Thread[]> {
    const res = await apiClient.get<ApiResponse<Thread[]>>(`/projects/${projectId}/threads`)
    return res.data.data
  },

  async createThread(data: { projectId: string; title: string; description?: string }): Promise<Thread> {
    const res = await apiClient.post<ApiResponse<Thread>>('/projects/threads', data)
    return res.data.data
  },

  async updateThread(id: string, data: { title?: string; description?: string; projectId?: string }): Promise<void> {
    await apiClient.patch(`/projects/threads/${id}`, data)
  },

  async deleteThread(id: string): Promise<void> {
    await apiClient.delete(`/projects/threads/${id}`)
  },

  async linkConversation(conversationId: string, threadId: string): Promise<void> {
    await apiClient.post('/projects/threads/link', { conversationId, threadId })
  },
}
