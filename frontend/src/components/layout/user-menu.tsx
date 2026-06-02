import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/store/auth'
import { UserAvatar } from './user-avatar'
import { cn } from '@/lib/utils'
import { User, Settings, Palette, Keyboard, HelpCircle, LogOut, ChevronDown } from 'lucide-react'

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  danger?: boolean
  onClick: () => void
}

function MenuItem({ icon, label, shortcut, danger, onClick }: MenuItemProps) {
  return (
    <button type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[14px] text-left transition-colors rounded-[2px]
        hover:bg-base-800
        group"
    >
      <span className={cn('size-3.5 shrink-0', danger ? 'text-red-400' : 'text-base-500 group-hover:text-base-300')}>
        {icon}
      </span>
      <span className={cn('flex-1', danger ? 'text-red-400' : 'text-base-400 group-hover:text-base-200')}>
        {label}
      </span>
      {shortcut && (
        <span className="text-[12px] text-base-600 font-mono">{shortcut}</span>
      )}
    </button>
  )
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  const handleSignOut = () => {
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="relative">
      <button type="button"
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-2 rounded-[4px] hover:bg-base-800 transition-colors group"
        aria-label="User menu"
        aria-expanded={open}
      >
        <UserAvatar fullName={user.fullName} size="sm" showIndicator />
        <span className="hidden sm:block text-[14px] text-base-400 group-hover:text-base-200 font-mono max-w-[120px] truncate">
          {user.fullName}
        </span>
        <ChevronDown className="size-3.5 text-base-600 group-hover:text-base-400 transition-colors" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full mt-1 w-56 rounded-[4px] border border-base-800 bg-surface shadow-xl z-50 py-1.5 animate-fade-in origin-top-right"
        >
          <div className="px-2.5 pb-1.5 mb-1 border-b border-base-800">
            <div className="flex items-center gap-2.5">
              <UserAvatar fullName={user.fullName} size="sm" />
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-base-200 font-mono truncate">{user.fullName}</p>
                <p className="text-[13px] text-base-500 font-mono truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <MenuItem icon={<User className="size-3.5" />} label="Profile" onClick={() => { setOpen(false); navigate('/settings') }} />
          <MenuItem icon={<Settings className="size-3.5" />} label="Settings" onClick={() => { setOpen(false); navigate('/settings') }} />
          <MenuItem icon={<Palette className="size-3.5" />} label="Theme" onClick={() => { setOpen(false); navigate('/settings') }} />
          <MenuItem icon={<Keyboard className="size-3.5" />} label="Keyboard shortcuts" shortcut="⌘K" onClick={() => { setOpen(false) }} />
          <MenuItem icon={<HelpCircle className="size-3.5" />} label="Help" onClick={() => { setOpen(false) }} />

          <div className="h-px bg-base-800 my-1 mx-2" />

          <MenuItem icon={<LogOut className="size-3.5" />} label="Sign out" danger onClick={handleSignOut} />
        </div>
      )}
    </div>
  )
}
