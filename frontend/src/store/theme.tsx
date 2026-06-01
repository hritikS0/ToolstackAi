import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { ThemeConfig } from '@/themes/types'
import { builtinThemes, getThemeById } from '@/themes/themes'
import { hexToRgb } from '@/themes/utils'

const STORAGE_KEY = 'toolstack-theme'

interface ThemeContextType {
  theme: ThemeConfig
  setTheme: Dispatch<SetStateAction<ThemeConfig>>
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  resetTheme: () => void
  exportTheme: () => string
  importTheme: (json: string) => boolean
}

function isInputTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement).tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable
}

const defaultTheme = getThemeById('original') || builtinThemes[0]

function loadTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as ThemeConfig
  } catch {}
  return defaultTheme
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement
  const c = theme.colors

  root.style.setProperty('--color-workspace', c.background)
  root.style.setProperty('--color-surface', c.surface)
  root.style.setProperty('--color-surface-alt', c.surfaceAlt)
  root.style.setProperty('--color-sidebar', c.sidebar)
  root.style.setProperty('--color-sidebar-border', c.sidebarBorder)
  root.style.setProperty('--color-accent', c.accent)
  root.style.setProperty('--color-accent-hover', c.accentHover)
  root.style.setProperty('--color-accent-muted', c.accentMuted)

  root.style.setProperty('--color-base-50', c.base50)
  root.style.setProperty('--color-base-100', c.base100)
  root.style.setProperty('--color-base-200', c.base200)
  root.style.setProperty('--color-base-300', c.base300)
  root.style.setProperty('--color-base-400', c.base400)
  root.style.setProperty('--color-base-500', c.base500)
  root.style.setProperty('--color-base-600', c.base600)
  root.style.setProperty('--color-base-700', c.base700)
  root.style.setProperty('--color-base-800', c.base800)
  root.style.setProperty('--color-base-900', c.base900)
  root.style.setProperty('--color-base-950', c.base950)

  root.style.setProperty('--font-mono', theme.typography.fontFamily)
  root.style.setProperty('--font-sans', theme.typography.fontFamily)
  root.style.fontSize = theme.typography.fontSize

  const radii = theme.borderRadius === 'sharp' ? '2px' : theme.borderRadius === 'medium' ? '4px' : '6px'
  root.style.setProperty('--radius-sm', radii)
  root.style.setProperty('--radius-md', radii)
  root.style.setProperty('--radius-lg', theme.borderRadius === 'rounded' ? '8px' : radii)

  const densityMap = { compact: '1.5', comfortable: '1.6', spacious: '1.8' }
  root.style.setProperty('--density-line-height', densityMap[theme.density])

  const [r, g, b] = hexToRgb(c.accent)
  root.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--color-accent-soft', `rgba(${r}, ${g}, ${b}, 0.15)`)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(loadTheme)
  const [isOpen, setIsOpen] = useState(false)
  const openRef = useRef(isOpen)
  openRef.current = isOpen

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)) } catch {}
  }, [theme])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T' && !isInputTarget(e)) {
        e.preventDefault()
        setIsOpen(!openRef.current)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const resetTheme = useCallback(() => {
    setTheme(defaultTheme)
  }, [])

  const exportTheme = useCallback(() => {
    return JSON.stringify(theme, null, 2)
  }, [theme])

  const importTheme = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as ThemeConfig
      if (parsed && parsed.colors && parsed.typography) {
        setTheme(parsed)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const value = useMemo(() => ({
    theme, setTheme, isOpen, setIsOpen,
    resetTheme, exportTheme, importTheme,
  }), [theme, isOpen, resetTheme, exportTheme, importTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const c = useContext(ThemeContext)
  if (!c) throw new Error('useTheme must be used within ThemeProvider')
  return c
}

export { defaultTheme, builtinThemes, getThemeById }
