import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[] | SelectOption[]
  placeholder?: string
  className?: string
  buttonClassName?: string
  popoverClassName?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  buttonClassName,
  popoverClassName,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [open])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between rounded-[4px] border border-base-800 bg-base-950 px-2.5 py-1.5 text-[11px] text-base-200 outline-none hover:text-base-100 transition-colors font-mono text-left',
          buttonClassName
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="size-3 text-base-500 shrink-0 ml-1.5" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-[4px] border border-base-800 bg-base-950 p-1 shadow-xl z-50 font-mono scrollbar-thin',
            popoverClassName
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-2 py-1 rounded-[2px] text-[11px] transition-colors truncate block',
                opt.value === value
                  ? 'bg-accent-muted text-accent font-medium'
                  : 'text-base-400 hover:text-base-200 hover:bg-base-900'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
