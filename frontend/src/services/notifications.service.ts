import apiClient from '@/api/client'

export interface AppNotification {
  id: string
  userId: string
  type: 'mail' | 'task' | 'habit' | 'system'
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

export const notificationsService = {
  async getNotifications() {
    const res = await apiClient.get<{ success: boolean; notifications: AppNotification[] }>('/notifications')
    return res.data
  },

  async markAsRead(id: string) {
    const res = await apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`)
    return res.data
  },

  async markAllAsRead() {
    const res = await apiClient.patch<{ success: boolean }>('/notifications/read-all')
    return res.data
  },

  async clearAll() {
    const res = await apiClient.delete<{ success: boolean }>('/notifications/clear')
    return res.data
  },
}
