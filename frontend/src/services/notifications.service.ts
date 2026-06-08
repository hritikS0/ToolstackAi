import apiClient from '@/api/client'
import type { NotificationPreferences, AppNotification } from '@/types/api'

export const notificationsService = {
  async getPreferences() {
    const res = await apiClient.get<{ success: boolean; data: NotificationPreferences }>('/notifications/preferences')
    return res.data
  },
  async updatePreferences(data: Partial<NotificationPreferences>) {
    const res = await apiClient.patch<{ success: boolean; data: NotificationPreferences }>('/notifications/preferences', data)
    return res.data
  },
  async getNotifications() {
    const res = await apiClient.get<{ success: boolean; data: AppNotification[] }>('/notifications')
    return res.data
  },
  async getCount() {
    const res = await apiClient.get<{ success: boolean; data: { count: number } }>('/notifications/count')
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
  async clearRead() {
    const res = await apiClient.delete<{ success: boolean }>('/notifications/clear-read')
    return res.data
  },
}
