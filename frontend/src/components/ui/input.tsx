import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-[4px] border border-base-800 bg-surface px-2.5 py-1.5 text-[11px] text-base-100 placeholder:text-base-600',
        'focus:outline-none focus:border-accent/50 transition-colors',
        'font-mono',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
export { Input }
