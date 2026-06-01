import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/utils'
import { CommandPalette } from './command-palette'
import { Search, Settings, LogOut, ChevronDown } from 'lucide-react'

export function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isOpen: cmdOpen, setIsOpen: setCmdOpen } = useCommandPalette()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  return (
    <>
      <div className="h-9 border-b border-base-800 bg-surface flex items-center px-3 gap-2 shrink-0">
        <div className="flex-1" />
        <button type="button"
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 h-6 px-2 rounded-[4px] text-[11px] text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
        >
          <Search className="size-3" />
          <span>Search</span>
          <kbd className="text-[10px] text-base-600 bg-base-800 px-1 rounded-[2px]">⌘K</kbd>
        </button>

        <div className="w-px h-4 bg-base-800 mx-1" />

        <div className="relative" ref={dropdownRef}>
          <button type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 h-6 px-2 rounded-[4px] text-[11px] text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors"
          >
            <div className="size-4 rounded-[3px] bg-base-700 flex items-center justify-center text-[9px] font-medium text-base-300">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="max-w-24 truncate">{user?.fullName || 'User'}</span>
            <ChevronDown className="size-3" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-base-800 bg-surface shadow-xl z-50 py-0.5">
              <button type="button"
                onClick={() => { setDropdownOpen(false); navigate('/settings') }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-base-400 hover:text-base-200 hover:bg-base-800"
              >
                <Settings className="size-3.5" />
                Settings
              </button>
              <button type="button"
                onClick={logout}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-red-400 hover:bg-base-800"
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
