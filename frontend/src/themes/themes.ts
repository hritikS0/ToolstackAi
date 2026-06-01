import type { ThemeColors, ThemeConfig } from './types'
import { deriveColors } from './utils'

const baseTypography = {
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
  fontSize: '12px',
  lineHeight: '1.6',
} as const

function theme(id: string, name: string, core: { background: string; surface: string; border: string; accent: string; text: string; muted: string }): ThemeConfig {
  return {
    id,
    name,
    colors: deriveColors(core) as ThemeColors,
    typography: { ...baseTypography },
    density: 'compact',
    borderRadius: 'medium',
  }
}

export const builtinThemes: ThemeConfig[] = [
  theme('original', 'Original', {
    background: '#121212',
    surface: '#1a1a1a',
    border: '#2a2a2a',
    accent: '#f59e0b',
    text: '#e0e0e0',
    muted: '#888888',
  }),
  theme('midnight', 'Midnight', {
    background: '#0a0a0f',
    surface: '#12121a',
    border: '#1e1e2a',
    accent: '#6366f1',
    text: '#e0e0f0',
    muted: '#8080a0',
  }),
  theme('terminal', 'Terminal', {
    background: '#0d1117',
    surface: '#161b22',
    border: '#21262d',
    accent: '#22c55e',
    text: '#c9d1d9',
    muted: '#8b949e',
  }),
  theme('copper', 'Copper', {
    background: '#1a1410',
    surface: '#221c16',
    border: '#332a20',
    accent: '#d97706',
    text: '#e0d5c8',
    muted: '#8a7a6a',
  }),
  theme('forest', 'Forest', {
    background: '#0f1a10',
    surface: '#162218',
    border: '#1f3022',
    accent: '#16a34a',
    text: '#d0e0d0',
    muted: '#708870',
  }),
  theme('ocean', 'Ocean', {
    background: '#0f172a',
    surface: '#172033',
    border: '#1e2940',
    accent: '#3b82f6',
    text: '#e0e8f0',
    muted: '#8090a8',
  }),
  theme('lavender', 'Lavender', {
    background: '#150f1a',
    surface: '#1d1724',
    border: '#2a2235',
    accent: '#a855f7',
    text: '#e0d8f0',
    muted: '#8870a8',
  }),
  theme('cyberpunk', 'Cyberpunk', {
    background: '#0a0a0a',
    surface: '#141414',
    border: '#2a2a2a',
    accent: '#ff00ff',
    text: '#e0e0e0',
    muted: '#888888',
  }),
  theme('gpt', 'GPT', {
    background: '#343541',
    surface: '#3e3f4b',
    border: '#4a4b57',
    accent: '#10a37f',
    text: '#ececf1',
    muted: '#9999a5',
  }),
  theme('claude', 'Claude', {
    background: '#1f1f1f',
    surface: '#2a2a2a',
    border: '#3a3a3a',
    accent: '#d97706',
    text: '#e0e0e0',
    muted: '#888888',
  }),
  theme('paper', 'Paper', {
    background: '#f5f5f0',
    surface: '#ecece5',
    border: '#d4d4cc',
    accent: '#b45309',
    text: '#1a1a1a',
    muted: '#888880',
  }),
  theme('light', 'Light', {
    background: '#ffffff',
    surface: '#f3f4f6',
    border: '#d1d5db',
    accent: '#2563eb',
    text: '#111827',
    muted: '#6b7280',
  }),
]

export function getThemeById(id: string): ThemeConfig | undefined {
  return builtinThemes.find(t => t.id === id)
}
