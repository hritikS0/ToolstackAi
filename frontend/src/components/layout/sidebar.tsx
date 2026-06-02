import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { MessageSquare, FileText, Image, Bug, History, Settings, PanelLeftClose, PanelLeft, Palette, BrainCircuit, Images } from 'lucide-react'

const navItems = [
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: FileText, label: 'PDF Chat', path: '/pdf' },
  { icon: Image, label: 'Image', path: '/image' },
  { icon: Images, label: 'Media', path: '/media' },
  { icon: Bug, label: 'Debug', path: '/debug' },
  { icon: History, label: 'History', path: '/conversations' },
  { icon: BrainCircuit, label: 'Brain', path: '/brain' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export function Sidebar({ collapsed, onToggle, onThemeClick }: { collapsed: boolean; onToggle: () => void; onThemeClick: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()

  const currentPath = '/' + location.pathname.split('/').filter(Boolean)[0]

  return (
    <div className={cn(
      'h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-100',
      collapsed ? 'w-[52px]' : 'w-[220px]',
    )}>
      <div className={cn(
        'flex items-center border-b border-sidebar-border h-[41px] shrink-0',
        collapsed ? 'justify-center px-0' : 'px-3',
      )}>
        {!collapsed && (
          <span className="text-[14px] font-medium text-accent tracking-wider uppercase cursor-pointer select-none" 
          onClick={() => navigate('/dashboard')}
          >ToolStack</span>
        )}
        <div className={collapsed ? '' : 'flex-1'} />
        <button type="button"
          onClick={onToggle}
          className="size-7 rounded-[4px] flex items-center justify-center text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </div>

      <nav className="flex-1 py-1 overflow-y-auto">
        {navItems.map(item => {
          const active = currentPath === item.path
          return (
            <button type="button"
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-2.5 w-full text-sm transition-colors relative group',
                collapsed ? 'justify-center h-10' : 'px-3 h-9',
                active
                  ? 'text-base-100 bg-accent-muted'
                  : 'text-base-400 hover:text-base-200 hover:bg-base-800/50',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate text-[14px] tracking-wide">{item.label}</span>}
              {active && (
                <span className={cn(
                  'absolute rounded-full bg-accent',
                  collapsed ? 'left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5' : 'left-0 top-1/2 -translate-y-1/2 w-0.5 h-5',
                )} />
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 rounded-[4px] bg-base-900 border border-base-800 text-[13px] text-base-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border py-1">
        <button type="button"
          onClick={onThemeClick}
          className={cn(
            'flex items-center gap-2.5 w-full text-sm transition-colors group',
            collapsed ? 'justify-center h-10' : 'px-3 h-9',
            'text-base-400 hover:text-base-200 hover:bg-base-800/50',
          )}
          title={collapsed ? 'Theme' : undefined}
        >
          <Palette className="size-4 shrink-0" />
          {!collapsed && <span className="truncate text-[14px] tracking-wide">Theme</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 rounded-[4px] bg-base-900 border border-base-800 text-[13px] text-base-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
              Theme
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
