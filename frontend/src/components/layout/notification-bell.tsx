import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { notificationsService } from '@/services/notifications.service'
import { useBrowserNotifications } from '@/hooks/use-browser-notifications'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Bell, Check, Trash2, Clock, Target, Zap, Info, Loader2 } from 'lucide-react'
import type { AppNotification } from '@/types/api'

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  task: { icon: Check, color: 'text-blue-400' },
  goal: { icon: Target, color: 'text-emerald-400' },
  habit: { icon: Zap, color: 'text-yellow-400' },
  reminder: { icon: Clock, color: 'text-purple-400' },
  system: { icon: Info, color: 'text-base-400' },
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const { sendNotification } = useBrowserNotifications()
  const { addToast } = useToast()

  const { data: notifs = [], isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try { return (await notificationsService.getNotifications()).data ?? [] }
      catch { return [] }
    },
    refetchInterval: 30000,
  })

  const unreadCount = notifs.filter(n => !n.read).length

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications'])
      queryClient.setQueryData<AppNotification[]>(['notifications'], old =>
        (old || []).map(n => ({ ...n, read: true })),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const clearReadMutation = useMutation({
    mutationFn: () => notificationsService.clearRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications'])
      queryClient.setQueryData<AppNotification[]>(['notifications'], old =>
        (old || []).filter(n => !n.read),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications'])
      queryClient.setQueryData<AppNotification[]>(['notifications'], old =>
        (old || []).map(n => n.id === id ? { ...n, read: true } : n),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  useEffect(() => {
    for (const n of notifs) {
      if (!n.read && !seenIds.current.has(n.id)) {
        seenIds.current.add(n.id)
        sendNotification(n.title, n.message, n.link || undefined)
        addToast({
          title: n.title,
          message: n.message,
          type: n.type as 'reminder' | 'task' | 'habit' | 'goal' | 'system',
          link: n.link || undefined,
        })
      }
    }
  }, [notifs, sendNotification, addToast])

  const handleToggle = () => {
    setOpen(o => !o)
  }

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markOneMutation.mutate(notif.id)
    }
    if (notif.link) {
      setOpen(false)
      navigate(notif.link)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={handleToggle}
        className="relative size-8 flex items-center justify-center rounded-[4px] hover:bg-base-800 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-4 text-base-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-mono text-white px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1 w-80 rounded-[4px] border border-base-800 bg-surface shadow-xl z-50 animate-fade-in origin-top-right"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-base-800">
            <span className="text-[11px] font-medium text-base-300 font-mono">
              {unreadCount > 0 ? `${unreadCount} Unread Notifications` : 'Notifications'}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-[10px] font-mono text-base-400 hover:text-base-200 px-1.5 py-0.5 rounded-[2px] hover:bg-base-800 transition-colors disabled:opacity-40"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    'Mark All Read'
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => clearReadMutation.mutate()}
                disabled={clearReadMutation.isPending || notifs.every(n => !n.read)}
                className="text-[10px] font-mono text-base-500 hover:text-base-300 px-1 py-0.5 rounded-[2px] hover:bg-base-800 transition-colors disabled:opacity-40"
              >
                {clearReadMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-base-500" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Bell className="size-6 text-base-700" />
                <p className="text-[11px] text-base-600 font-mono">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => {
                const config = typeConfig[n.type] || typeConfig.system
                const Icon = config.icon
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    disabled={markOneMutation.isPending}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-base-800 border-b border-base-850',
                      !n.read && 'bg-accent-muted/30',
                    )}
                  >
                    <Icon className={cn('size-3.5 mt-0.5 shrink-0', config.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('text-[11px] font-medium font-mono truncate', n.read ? 'text-base-400' : 'text-base-200')}>
                          {n.title}
                        </p>
                        <span className="text-[9px] text-base-600 font-mono shrink-0">{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-base-500 font-mono mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.read && (
                      <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
