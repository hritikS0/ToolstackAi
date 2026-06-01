import type { ThemeConfig } from '@/themes/types'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface ThemeCardProps {
  theme: ThemeConfig
  active: boolean
  onSelect: () => void
}

export function ThemeCard({ theme, active, onSelect }: ThemeCardProps) {
  const c = theme.colors

  return (
    <button type="button"
      onClick={onSelect}
      className={cn(
        'relative rounded-[4px] border p-2.5 text-left transition-all hover:scale-[1.02]',
        active ? 'border-accent bg-accent-muted' : 'border-base-800 bg-surface hover:border-base-700',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex -space-x-1">
          <span className="size-3.5 rounded-full border border-white/10" style={{ background: c.accent }} />
          <span className="size-3.5 rounded-full border border-white/10" style={{ background: c.background }} />
          <span className="size-3.5 rounded-full border border-white/10" style={{ background: c.surface }} />
        </div>
        {active && (
          <span className="ml-auto flex items-center justify-center size-4 rounded-full bg-accent text-white">
            <Check className="size-2.5" />
          </span>
        )}
      </div>
      <div className="text-[11px] font-medium font-mono" style={{ color: theme.colors.text }}>{theme.name}</div>
    </button>
  )
}
