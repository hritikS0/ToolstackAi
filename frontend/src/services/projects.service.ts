import apiClient from '@/api/client'
import type { Project } from '@/types/api'

interface CreateProjectData {
  name: string
  description?: string
  color?: string
  icon?: string
}

export const projectsService = {
  async list() {
    const res = await apiClient.get<{ success: boolean; data: Project[] }>('/projects')
    return res.data
  },
  async getById(id: string) {
    const res = await apiClient.get<{ success: boolean; data: Project }>(`/projects/${id}`)
    return res.data
  },
  async create(data: CreateProjectData) {
    const res = await apiClient.post<{ success: boolean; data: Project }>('/projects', data)
    return res.data
  },
  async update(id: string, data: Partial<Project>) {
    const res = await apiClient.patch<{ success: boolean; data: Project }>(`/projects/${id}`, data)
    return res.data
  },
  async delete(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/projects/${id}`)
    return res.data
  },
}
