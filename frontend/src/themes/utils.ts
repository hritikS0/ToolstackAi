import type { ThemeColors } from './types'

export function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}

export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

export function blend(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

type CoreColors = { background: string; surface: string; border: string; accent: string; text: string; muted: string }

export function deriveColors(core: CoreColors): ThemeColors {
  return {
    ...core,
    sidebar: darken(core.background, 0.04),
    sidebarBorder: core.border,
    surfaceAlt: lighten(core.surface, 0.03),
    accentHover: darken(core.accent, 0.12),
    accentMuted: rgba(core.accent, 0.1),
    base950: core.background,
    base900: core.surface,
    base800: core.border,
    base700: blend(core.border, core.surface, 0.5),
    base600: blend(core.border, core.muted, 0.3),
    base500: blend(core.border, core.muted, 0.6),
    base400: core.muted,
    base300: blend(core.muted, core.text, 0.3),
    base200: blend(core.muted, core.text, 0.6),
    base100: core.text,
    base50: lighten(core.text, 0.3),
  }
}
