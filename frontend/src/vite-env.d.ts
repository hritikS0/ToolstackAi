/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_STORAGE_TOKEN_KEY: string
  readonly VITE_STORAGE_USER_KEY: string
  readonly VITE_LOGIN_PATH: string
  readonly VITE_DASHBOARD_PATH: string
  readonly VITE_IMAGE_UPLOAD_TIMEOUT: string
  readonly VITE_PDF_UPLOAD_TIMEOUT: string
  readonly VITE_QUERY_RETRY: string
  readonly VITE_QUERY_STALE_TIME: string
  readonly VITE_DEV_PORT: string
  readonly VITE_API_PROXY_PATH: string
  readonly VITE_API_PROXY_TARGET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
