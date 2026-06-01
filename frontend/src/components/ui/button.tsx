import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[11px] font-medium transition-all duration-75 select-none',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-40',
        'rounded-[4px]',
        variant === 'primary' && 'bg-accent text-neutral-950 hover:bg-accent-hover active:opacity-90',
        variant === 'secondary' && 'bg-base-800 text-base-300 hover:text-base-200 hover:bg-base-700 border border-base-700',
        variant === 'ghost' && 'text-base-500 hover:text-base-300 hover:bg-base-800',
        size === 'sm' && 'h-7 px-2.5',
        size === 'md' && 'h-8 px-3',
        size === 'icon' && 'size-7',
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="size-3.5 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
export { Button }
