import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { UserMenu } from '@/components/layout/user-menu'
import { ThemeModal } from '@/components/theme/theme-modal'
import { useTheme } from '@/store/theme'
import { config } from '@/config'
import { Menu } from 'lucide-react'
import { useEffect } from 'react'

export function AppLayout() {
  const { isAuthenticated } = useAuth()
  const { setIsOpen } = useTheme()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  if (!isAuthenticated) return <Navigate to={config.auth.loginPath} replace />

  return (
    <div className="h-screen flex overflow-hidden bg-workspace">
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} onThemeClick={() => setIsOpen(true)} />
      </div>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed inset-y-0 left-0 z-50">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onThemeClick={() => { setMobileOpen(false); setIsOpen(true) }} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 h-11 flex items-center justify-between px-4 border-b border-base-800">
          <button type="button" onClick={() => setMobileOpen(true)} className="md:hidden size-8 flex items-center justify-center text-base-400 hover:text-base-200">
            <Menu className="size-4" />
          </button>
          <div className="flex-1 md:hidden" />
          <UserMenu />
        </div>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <ThemeModal />
    </div>
  )
}
