import apiClient from '@/api/client'

export const filesService = {
  async deleteFile(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/files/${id}`)
    return res.data
  },
}
