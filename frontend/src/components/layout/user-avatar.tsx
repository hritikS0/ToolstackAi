import { cn } from '@/lib/utils'



interface UserAvatarProps {
  fullName?: string | null
  size?: 'sm' | 'md'
  showIndicator?: boolean
  className?: string
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserAvatar({ fullName, size = 'md', showIndicator, className }: UserAvatarProps) {
  const initials = getInitials(fullName ?? '')

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center font-mono font-medium text-accent select-none',
          size === 'sm' && 'size-7 text-[11px]',
          size === 'md' && 'size-8 text-xs',
        )}
      >
        {initials}
      </div>
      {showIndicator && (
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-workspace" />
      )}
    </div>
  )
}
