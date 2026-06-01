import { cn } from '@/lib/utils'

const variants = {
  default: 'border-transparent bg-accent-muted text-accent',
  error: 'border-transparent bg-red-500/10 text-red-400',
  success: 'border-transparent bg-emerald-500/10 text-emerald-400',
  warn: 'border-transparent bg-yellow-500/10 text-yellow-400',
  neutral: 'border border-base-800 text-base-400',
} as const

interface BadgeProps {
  variant?: keyof typeof variants
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-tight', variants[variant], className)}>
      {children}
    </span>
  )
}
