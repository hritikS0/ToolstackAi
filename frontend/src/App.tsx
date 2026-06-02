import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/store/auth'
import { ThemeProvider } from '@/store/theme'
import { AppRoutes } from '@/routes'
import { config } from '@/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: config.query.retry, staleTime: config.query.staleTime, refetchOnWindowFocus: false },
  },
})

function App() {
  useEffect(() => {
    // Instantly wake up Render free-tier backend in the background when app mounts
    const baseUrl = config.api.baseUrl
    fetch(`${baseUrl}/health`).catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
