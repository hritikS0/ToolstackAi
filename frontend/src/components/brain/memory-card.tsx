import type { Memory } from '@/types/api'
import { cn } from '@/lib/utils'
import { Pin, PinOff, Sparkles } from 'lucide-react'

interface MemoryCardProps {
  memory: Memory
  active?: boolean
  onSelect: () => void
  onTogglePin: () => void
}

const categoryColors: Record<string, string> = {
  Identity: 'border-violet-500/30 bg-violet-500/5',
  Preferences: 'border-blue-500/30 bg-blue-500/5',
  Projects: 'border-emerald-500/30 bg-emerald-500/5',
  Goals: 'border-amber-500/30 bg-amber-500/5',
  Skills: 'border-cyan-500/30 bg-cyan-500/5',
  Work: 'border-orange-500/30 bg-orange-500/5',
  Personal: 'border-pink-500/30 bg-pink-500/5',
}

export function MemoryCard({ memory, active, onSelect, onTogglePin }: MemoryCardProps) {
  const catColor = categoryColors[memory.category] || 'border-base-700 bg-base-800/30'

  return (
    <button type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-[4px] border p-2.5 transition-all hover:border-accent/40',
        active ? 'border-accent bg-accent-muted' : catColor,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-medium text-base-400 font-mono uppercase tracking-wider">{memory.category}</span>
            {memory.importance >= 4 && (
              <Sparkles className="size-3 text-accent" />
            )}
          </div>
          <div className="text-[12px] font-medium text-base-100 font-mono truncate">{memory.title}</div>
          <div className="text-[11px] text-base-500 font-mono mt-0.5 line-clamp-1">{memory.content}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-base-600 font-mono">
              {new Date(memory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className={cn(
              'text-[9px] font-mono px-1 rounded-[2px]',
              memory.confidence >= 0.8 ? 'text-emerald-500 bg-emerald-500/10' :
              memory.confidence >= 0.5 ? 'text-amber-500 bg-amber-500/10' :
              'text-red-500 bg-red-500/10',
            )}>
              {Math.round(memory.confidence * 100)}%
            </span>
          </div>
        </div>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePin() }}
          className={cn(
            'size-5 shrink-0 flex items-center justify-center rounded-[2px] transition-colors',
            memory.pinned ? 'text-accent' : 'text-base-700 hover:text-base-500 opacity-0 group-hover:opacity-100',
          )}
        >
          {memory.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
        </button>
      </div>
    </button>
  )
}
