import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/store/auth'
import { ThemeProvider } from '@/store/theme'
import { ToastProvider } from '@/components/ui/toast'
import { AppRoutes } from '@/routes'
import { config } from '@/config'

import { WorkspaceLayoutProvider } from '@/store/workspace-layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: config.query.retry, staleTime: config.query.staleTime, refetchOnWindowFocus: false },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <WorkspaceLayoutProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </WorkspaceLayoutProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
