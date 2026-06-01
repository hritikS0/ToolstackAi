import apiClient from '@/api/client'
import type { MediaItem } from '@/types/api'

export const mediaService = {
  async getMedia() {
    const res = await apiClient.get<{ success: boolean; data: MediaItem[] }>('/media')
    return res.data
  },
  async deleteMedia(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/media/${id}`)
    return res.data
  },
  getFileUrl(id: string): string {
    return `${apiClient.defaults.baseURL}/media/file/${id}`
  },
}
