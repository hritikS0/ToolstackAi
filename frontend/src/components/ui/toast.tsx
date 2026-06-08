import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, Bell, Check, Clock, Target, Zap, Info } from 'lucide-react'

interface Toast {
  id: string
  title: string
  message: string
  type?: 'reminder' | 'task' | 'habit' | 'goal' | 'system'
  link?: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  dismissToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

const iconMap: Record<string, typeof Bell> = {
  reminder: Clock,
  task: Check,
  habit: Zap,
  goal: Target,
  system: Info,
}

const colorMap: Record<string, string> = {
  reminder: 'border-l-purple-400',
  task: 'border-l-blue-400',
  habit: 'border-l-yellow-400',
  goal: 'border-l-emerald-400',
  system: 'border-l-base-400',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-3), { ...t, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 6000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const Icon = iconMap[t.type || 'system'] || Info
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto rounded-[4px] border border-base-800 bg-surface shadow-2xl border-l-2 animate-slide-up',
                colorMap[t.type || 'system'] || colorMap.system,
              )}
              role="alert"
            >
              <div className="flex items-start gap-2.5 p-3">
                <Icon className="size-3.5 mt-0.5 shrink-0 text-base-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-base-200 font-mono">{t.title}</p>
                  <p className="text-[10px] text-base-500 font-mono mt-0.5">{t.message}</p>
                  {t.link && (
                    <a href={t.link} className="text-[10px] text-accent font-mono mt-1.5 inline-block hover:underline">
                      View
                    </a>
                  )}
                </div>
                <button onClick={() => dismissToast(t.id)} className="text-base-600 hover:text-base-300 shrink-0">
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
