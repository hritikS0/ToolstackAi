import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { UserMenu } from '@/components/layout/user-menu'
import { ThemeModal } from '@/components/theme/theme-modal'
import { useTheme } from '@/store/theme'
import { config } from '@/config'

export function AppLayout() {
  const { isAuthenticated } = useAuth()
  const { setIsOpen } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  if (!isAuthenticated) return <Navigate to={config.auth.loginPath} replace />

  return (
    <div className="h-screen flex overflow-hidden bg-workspace">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} onThemeClick={() => setIsOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 h-10 flex items-center justify-end px-4 border-b border-base-800">
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
