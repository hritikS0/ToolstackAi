import { useCallback } from 'react'
import { playNotificationSound } from '@/lib/sound'

export function useBrowserNotifications() {
  const sendNotification = useCallback((title: string, body: string, link?: string) => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      playNotificationSound()
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'toolstack-notification',
      })
      if (link) {
        n.onclick = () => {
          window.focus()
          window.location.href = link
          n.close()
        }
      }
      setTimeout(() => n.close(), 8000)
    }
  }, [])

  return { sendNotification }
}
