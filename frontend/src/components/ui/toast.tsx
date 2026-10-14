import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'error' | 'success' | 'warning' | 'info' | 'default'

export interface ToastOptions {
  type?: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void
  toast: {
    error: (message: string, title?: string, duration?: number) => void
    success: (message: string, title?: string, duration?: number) => void
    warning: (message: string, title?: string, duration?: number) => void
    info: (message: string, title?: string, duration?: number) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

let toastId = 0

// Global helper to trigger toast from outside React tree (e.g. axios interceptors)
export function triggerToast(options: ToastOptions) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: options }))
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToastItem = useCallback((options: ToastOptions) => {
    const id = String(++toastId)
    const duration = options.duration ?? (options.type === 'error' ? 5000 : 3500)
    const item: ToastItem = { ...options, id }
    setToasts(prev => [...prev, item])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const addToast = useCallback((message: string, type?: ToastType) => {
    let resolvedType = type
    if (!resolvedType) {
      const lower = message.toLowerCase()
      if (lower.includes('failed') || lower.includes('error') || lower.includes('invalid') || lower.includes('could not') || lower.includes('unable to')) {
        resolvedType = 'error'
      } else if (lower.includes('success') || lower.includes('saved') || lower.includes('created') || lower.includes('complete') || lower.includes('unpinned') || lower.includes('pinned')) {
        resolvedType = 'success'
      } else {
        resolvedType = 'default'
      }
    }
    addToastItem({ message, type: resolvedType })
  }, [addToastItem])

  const toastHelpers = {
    error: useCallback((message: string, title?: string, duration?: number) => {
      addToastItem({ message, title: title || 'Error', type: 'error', duration })
    }, [addToastItem]),
    success: useCallback((message: string, title?: string, duration?: number) => {
      addToastItem({ message, title: title || 'Success', type: 'success', duration })
    }, [addToastItem]),
    warning: useCallback((message: string, title?: string, duration?: number) => {
      addToastItem({ message, title: title || 'Warning', type: 'warning', duration })
    }, [addToastItem]),
    info: useCallback((message: string, title?: string, duration?: number) => {
      addToastItem({ message, title: title || 'Info', type: 'info', duration })
    }, [addToastItem]),
  }

  // Listen for global custom events
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>
      if (customEvent.detail) {
        addToastItem(customEvent.detail)
      }
    }
    window.addEventListener('app-toast', handleCustomToast)
    return () => window.removeEventListener('app-toast', handleCustomToast)
  }, [addToastItem])

  return (
    <ToastContext.Provider value={{ addToast, toast: toastHelpers }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0"
        aria-live="polite"
      >
        {toasts.map(t => {
          const type = t.type || 'default'

          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3 rounded-[6px] border text-[13px] font-mono shadow-2xl backdrop-blur-md transition-all duration-200 animate-fade-in',
                type === 'error' && 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-950/40',
                type === 'success' && 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/40',
                type === 'warning' && 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/40',
                type === 'info' && 'bg-blue-950/90 border-blue-500/40 text-blue-200 shadow-blue-950/40',
                type === 'default' && 'bg-surface-alt/95 border-base-700 text-base-200'
              )}
            >
              <div className="shrink-0 mt-0.5">
                {type === 'error' && <AlertCircle className="size-4 text-red-400" />}
                {type === 'success' && <CheckCircle2 className="size-4 text-emerald-400" />}
                {type === 'warning' && <AlertTriangle className="size-4 text-amber-400" />}
                {type === 'info' && <Info className="size-4 text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && (
                  <div className={cn(
                    'text-[12px] font-bold tracking-wide uppercase mb-0.5',
                    type === 'error' && 'text-red-400',
                    type === 'success' && 'text-emerald-400',
                    type === 'warning' && 'text-amber-400',
                    type === 'info' && 'text-blue-400',
                    type === 'default' && 'text-base-100',
                  )}>
                    {t.title}
                  </div>
                )}
                <div className="leading-snug text-xs break-words">{t.message}</div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-base-400 hover:text-base-100 p-0.5 rounded transition-colors"
                title="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
