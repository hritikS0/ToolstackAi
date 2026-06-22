import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/store/auth'
import { ThemeProvider } from '@/store/theme'
import { ToastProvider } from '@/components/ui/toast'
import { AppRoutes } from '@/routes'
import { config } from '@/config'

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
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
