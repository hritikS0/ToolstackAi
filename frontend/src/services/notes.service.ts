import apiClient from '@/api/client'
import type { Note } from '@/types/api'

interface NoteQuery {
  search?: string
  tag?: string
  projectId?: string
}

interface CreateNoteData {
  title: string
  content: string
  tags?: string[]
  projectId?: string
}

interface SummarizeResponse {
  summary: string
}

interface ExtractTasksResponse {
  tasksCreated: number
}

export const notesService = {
  async list(params?: NoteQuery) {
    const res = await apiClient.get<{ success: boolean; data: Note[] }>('/notes', { params })
    return res.data
  },

  async getById(id: string) {
    const res = await apiClient.get<{ success: boolean; data: Note }>(`/notes/${id}`)
    return res.data
  },

  async create(data: CreateNoteData) {
    const res = await apiClient.post<{ success: boolean; data: Note }>('/notes', data)
    return res.data
  },

  async update(id: string, data: Partial<CreateNoteData>) {
    const res = await apiClient.patch<{ success: boolean; data: Note }>(`/notes/${id}`, data)
    return res.data
  },

  async delete(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/notes/${id}`)
    return res.data
  },

  async summarize(id: string) {
    const res = await apiClient.post<{ success: boolean; data: SummarizeResponse }>(`/notes/${id}/summarize`)
    return res.data
  },

  async extractTasks(id: string) {
    const res = await apiClient.post<{ success: boolean; data: ExtractTasksResponse }>(`/notes/${id}/extract-tasks`)
    return res.data
  },

  async search(query: string) {
    const res = await apiClient.get<{ success: boolean; data: Note[] }>('/notes/search', { params: { q: query } })
    return res.data
  },
}
