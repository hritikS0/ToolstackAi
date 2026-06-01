const env = (key: string, fallback: string): string =>
  (import.meta.env as Record<string, string>)[key] ?? fallback

const envNum = (key: string, fallback: number): number => {
  const val = env(key, String(fallback))
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  api: {
    baseUrl: env('VITE_API_BASE_URL', '/api'),
    timeout: envNum('VITE_API_TIMEOUT', 30000),
  },
  auth: {
    tokenKey: env('VITE_STORAGE_TOKEN_KEY', 'toolstack_token'),
    userKey: env('VITE_STORAGE_USER_KEY', 'toolstack_user'),
    loginPath: env('VITE_LOGIN_PATH', '/login'),
    dashboardPath: env('VITE_DASHBOARD_PATH', '/dashboard'),
  },
  uploads: {
    imageTimeout: envNum('VITE_IMAGE_UPLOAD_TIMEOUT', 60000),
    pdfTimeout: envNum('VITE_PDF_UPLOAD_TIMEOUT', 120000),
  },
  query: {
    retry: envNum('VITE_QUERY_RETRY', 1),
    staleTime: envNum('VITE_QUERY_STALE_TIME', 30000),
  },
}
