export interface ThemeColors {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  accent: string
  accentHover: string
  accentMuted: string
  text: string
  muted: string
  sidebar: string
  sidebarBorder: string
  base50: string
  base100: string
  base200: string
  base300: string
  base400: string
  base500: string
  base600: string
  base700: string
  base800: string
  base900: string
  base950: string
}

export interface ThemeTypography {
  fontFamily: string
  fontSize: string
  lineHeight: string
}

export type Density = 'compact' | 'comfortable' | 'spacious'
export type BorderRadius = 'sharp' | 'medium' | 'rounded'

export interface ThemeConfig {
  id: string
  name: string
  colors: ThemeColors
  typography: ThemeTypography
  density: Density
  borderRadius: BorderRadius
}
