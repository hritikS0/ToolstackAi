import { cn } from '@/lib/utils'

export function Tabs({ tabs, activeTab, onTabChange, className }: {
  tabs: { id: string; label: string }[]
  activeTab: string
  onTabChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-0.5 bg-surface rounded-md p-0.5 border border-base-800', className)}>
      {tabs.map(tab => (
        <button type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-[3px] transition-all duration-100 select-none',
            tab.id === activeTab
              ? 'bg-base-800 text-base-100'
              : 'text-base-400 hover:text-base-200',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
