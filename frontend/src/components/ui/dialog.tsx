import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  isLoading?: boolean
  icon?: ReactNode
}

export function Dialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', isLoading, icon }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface border border-base-800 rounded-[4px] w-full max-w-xs shadow-lg">
        <div className="p-4">
          {icon && <div className="mb-3">{icon}</div>}
          <h2 className="text-sm font-medium text-base-100 mb-1 font-mono">{title}</h2>
          <p className="text-[11px] text-base-500 leading-relaxed font-mono">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} loading={isLoading} className="bg-red-500 hover:bg-red-600">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
