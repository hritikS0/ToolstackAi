import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { notificationsService, type AppNotification } from '@/services/notifications.service'
import { useToast } from '@/components/ui/toast'
import { config as appConfig } from '@/config'
import { cn } from '@/lib/utils'
import {
  Bell, Mail, CheckSquare, Flame, Info, Check, Trash2, X
} from 'lucide-react'

export function NotificationPanel() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  // Fetch notifications
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getNotifications(),
  })

  const notifications = data?.notifications || []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      addToast('All notifications marked as read')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsService.clearAll(),
    onSuccess: () => {
      addToast('Notifications cleared')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Socket.io Client Setup
  useEffect(() => {
    const token = localStorage.getItem(appConfig.auth.tokenKey)
    if (!token) return

    // Connect to backend Socket.io server (port 5001)
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5001'
    const socketUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:${backendPort}`

    const socket: Socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    })

    socket.on('new_notification', (newNotif: AppNotification) => {
      addToast(`🔔 ${newNotif.title}`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (newNotif.type === 'mail') {
        queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient, addToast])

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true
    return n.type === filterType
  })

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.link) {
      navigate(notif.link)
      setIsOpen(false)
    }
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'mail':
        return <Mail className="size-3.5 text-cyan-400 shrink-0" />
      case 'task':
        return <CheckSquare className="size-3.5 text-emerald-400 shrink-0" />
      case 'habit':
        return <Flame className="size-3.5 text-amber-400 shrink-0" />
      default:
        return <Info className="size-3.5 text-accent shrink-0" />
    }
  }

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative size-8 flex items-center justify-center text-base-400 hover:text-base-200 hover:bg-base-800 rounded transition-colors"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-accent animate-pulse" />
        )}
      </button>

      {/* Notification Dropdown / Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-80 md:w-96 bg-sidebar border border-sidebar-border rounded-lg shadow-2xl flex flex-col font-mono text-xs overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-sidebar-border flex items-center justify-between bg-base-950">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base-100 uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold text-[10px]">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllReadMutation.mutate()}
                    className="p-1 text-base-400 hover:text-accent"
                    title="Mark all as read"
                  >
                    <Check className="size-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearAllMutation.mutate()}
                    className="p-1 text-base-400 hover:text-rose-400"
                    title="Clear all"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-base-500 hover:text-base-200"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-sidebar-border bg-base-900/50 p-1 gap-1 text-[10px]">
              {['all', 'mail', 'task', 'habit'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'flex-1 py-1 rounded uppercase font-bold transition-colors text-center',
                    filterType === t
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'text-base-400 hover:text-base-200 hover:bg-base-800/40'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-base-850">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-base-500 space-y-1">
                  <Bell className="size-6 mx-auto text-base-700" />
                  <div>No notifications</div>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      'p-3 cursor-pointer transition-colors flex items-start gap-2.5 hover:bg-base-900/60',
                      !notif.isRead && 'bg-accent-muted/20'
                    )}
                  >
                    <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className={cn('font-semibold text-xs', notif.isRead ? 'text-base-300' : 'text-base-100')}>
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-base-500">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-base-400 font-sans line-clamp-2 leading-relaxed">{notif.message}</p>
                    </div>
                    {!notif.isRead && <span className="size-1.5 rounded-full bg-accent shrink-0 mt-1" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
