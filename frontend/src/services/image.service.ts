import apiClient from '@/api/client'
import { config } from '@/config'
import type { ImageAnalysisResult } from '@/types/api'

export const imageService = {
  async analyze(file: File) {
    const form = new FormData()
    form.append('image', file)
    const res = await apiClient.post<{ success: boolean; data: ImageAnalysisResult }>('/image/analyze', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: config.uploads.imageTimeout,
    })
    return res.data
  },
}
