import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme, builtinThemes } from '@/store/theme'
import type { ThemeConfig, Density, BorderRadius } from '@/themes/types'
import { ThemeCard } from './theme-card'
import { PreviewPanel } from './preview-panel'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import { X, Palette, Sliders, Eye, Download, Upload, RotateCcw, Save, Check, ChevronDown } from 'lucide-react'

const fontOptions = [
  { label: 'Geist Mono', value: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', 'Fira Code', ui-monospace, monospace" },
  { label: 'Fira Code', value: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace" },
]

const densityOptions: { label: string; value: Density; desc: string }[] = [
  { label: 'Compact', value: 'compact', desc: 'Dense, minimal padding' },
  { label: 'Comfortable', value: 'comfortable', desc: 'Balanced spacing' },
  { label: 'Spacious', value: 'spacious', desc: 'Relaxed, roomy' },
]

const radiusOptions: { label: string; value: BorderRadius; desc: string }[] = [
  { label: 'Sharp', value: 'sharp', desc: '2px corners' },
  { label: 'Medium', value: 'medium', desc: '4px corners' },
  { label: 'Rounded', value: 'rounded', desc: '6px corners' },
]

type Tab = 'themes' | 'customize' | 'preview'

const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'customize', label: 'Customize', icon: Sliders },
  { id: 'preview', label: 'Preview', icon: Eye },
]

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-base-400 w-20 shrink-0">{label}</span>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-6 w-8 rounded-[2px] border border-base-800 cursor-pointer bg-transparent p-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => {
          const v = e.target.value
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
        }}
        className="flex-1 h-6 rounded-[2px] border border-base-800 bg-base-950 px-1.5 text-[10px] font-mono text-base-200 outline-none focus:border-accent/40 transition-colors"
      />
    </label>
  )
}

export function ThemeModal() {
  const { theme, setTheme, isOpen, setIsOpen, resetTheme, exportTheme, importTheme } = useTheme()
  const [tab, setTab] = useState<Tab>('themes')
  const [importError, setImportError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [fontOpen, setFontOpen] = useState(false)
  const fontRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); return }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, setIsOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, setIsOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fontRef.current && !fontRef.current.contains(e.target as Node)) setFontOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const updateTheme = useCallback((patch: Partial<ThemeConfig>) => {
    setTheme(prev => ({ ...prev, ...patch }))
  }, [setTheme])

  const updateColors = useCallback((colors: Partial<ThemeConfig['colors']>) => {
    setTheme(prev => ({ ...prev, colors: { ...prev.colors, ...colors } }))
  }, [setTheme])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const ok = importTheme(text)
      setImportError(ok ? '' : 'Invalid theme file')
      if (ok) setTimeout(() => setImportError(''), 2000)
    }
    input.click()
  }, [importTheme])

  const handleExport = useCallback(() => {
    const json = exportTheme()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${theme.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportTheme, theme.id])

  const handleSaveCustom = useCallback(() => {
    const customId = `custom-${Date.now()}`
    const custom: ThemeConfig = { ...theme, id: customId, name: 'Custom' }
    setTheme(custom)
    setSavedMsg('Theme saved')
    setTimeout(() => setSavedMsg(''), 2000)
  }, [theme, setTheme])

  if (!isOpen) return null

  const currentFontLabel = fontOptions.find(f => f.value === theme.typography.fontFamily)?.label || 'Custom'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div
        ref={modalRef}
        className="w-[680px] max-h-[85vh] rounded-[6px] border border-base-800 bg-surface shadow-2xl flex flex-col animate-fade-in origin-center"
      >
        <div className="flex items-center justify-between h-10 px-3 border-b border-base-800 shrink-0">
          <div className="flex items-center gap-1">
            {tabs.map(t => (
              <button type="button"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-mono transition-colors',
                  tab === t.id ? 'bg-accent-muted text-accent' : 'text-base-400 hover:text-base-200',
                )}
              >
                <t.icon className="size-3" />
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="size-6 flex items-center justify-center rounded-[4px] text-base-500 hover:text-base-200 hover:bg-base-800 transition-colors">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {tab === 'themes' && (
            <div className="grid grid-cols-4 gap-2">
              {builtinThemes.map(t => (
                <ThemeCard key={t.id} theme={t} active={theme.id === t.id} onSelect={() => setTheme(t)} />
              ))}
            </div>
          )}

          {tab === 'customize' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-2">Colors</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <ColorInput label="Background" value={theme.colors.background} onChange={v => updateColors({ background: v })} />
                  <ColorInput label="Surface" value={theme.colors.surface} onChange={v => updateColors({ surface: v })} />
                  <ColorInput label="Border" value={theme.colors.border} onChange={v => updateColors({ border: v })} />
                  <ColorInput label="Accent" value={theme.colors.accent} onChange={v => updateColors({ accent: v })} />
                  <ColorInput label="Text" value={theme.colors.text} onChange={v => updateColors({ text: v })} />
                  <ColorInput label="Muted" value={theme.colors.muted} onChange={v => updateColors({ muted: v })} />
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-2">Typography</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div className="relative" ref={fontRef}>
                    <label className="text-[10px] font-mono text-base-400 block mb-0.5">Font Family</label>
                    <button type="button"
                      onClick={() => setFontOpen(!fontOpen)}
                      className="flex items-center gap-1 w-full h-6 rounded-[2px] border border-base-800 bg-base-950 px-1.5 text-[10px] font-mono text-base-200"
                    >
                      <span className="flex-1 text-left">{currentFontLabel}</span>
                      <ChevronDown className="size-3 text-base-500" />
                    </button>
                    {fontOpen && (
                      <div className="absolute top-full left-0 right-0 mt-0.5 rounded-[4px] border border-base-800 bg-surface shadow-lg z-10 overflow-hidden">
                        {fontOptions.map(f => (
                          <button type="button"
                            key={f.value}
                            onClick={() => { updateTheme({ typography: { ...theme.typography, fontFamily: f.value } }); setFontOpen(false) }}
                            className={cn(
                              'w-full text-left px-2 py-1 text-[10px] font-mono transition-colors',
                              theme.typography.fontFamily === f.value ? 'bg-accent-muted text-accent' : 'text-base-400 hover:bg-base-800 hover:text-base-200',
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-base-400 block mb-0.5">Font Size</label>
                    <Select
                      value={theme.typography.fontSize}
                      onChange={val => updateTheme({ typography: { ...theme.typography, fontSize: val } })}
                      options={['15px', '16px', '17px', '18px', '20px'].map(s => ({ value: s, label: s }))}
                      buttonClassName="h-6 py-0 px-1.5 text-[10px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-2">Density</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {densityOptions.map(d => (
                    <button type="button"
                      key={d.value}
                      onClick={() => updateTheme({ density: d.value })}
                      className={cn(
                        'rounded-[4px] border p-2 text-left transition-colors',
                        theme.density === d.value ? 'border-accent bg-accent-muted' : 'border-base-800 hover:border-base-700',
                      )}
                    >
                      <div className="text-[10px] font-medium font-mono" style={{ color: theme.density === d.value ? theme.colors.accent : theme.colors.text }}>{d.label}</div>
                      <div className="text-[9px] font-mono" style={{ color: theme.colors.muted }}>{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-2">Border Radius</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {radiusOptions.map(r => (
                    <button type="button"
                      key={r.value}
                      onClick={() => updateTheme({ borderRadius: r.value })}
                      className={cn(
                        'rounded-[4px] border p-2 text-left transition-colors',
                        theme.borderRadius === r.value ? 'border-accent bg-accent-muted' : 'border-base-800 hover:border-base-700',
                      )}
                    >
                      <div className="text-[10px] font-medium font-mono" style={{ color: theme.borderRadius === r.value ? theme.colors.accent : theme.colors.text }}>{r.label}</div>
                      <div className="text-[9px] font-mono" style={{ color: theme.colors.muted }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'preview' && (
            <div>
              <p className="text-[10px] font-mono text-base-500 mb-2">Live preview of the current theme</p>
              <PreviewPanel theme={theme} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between h-9 px-3 border-t border-base-800 shrink-0">
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleExport} className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-mono text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors">
              <Download className="size-3" /> Export
            </button>
            <button type="button" onClick={handleImport} className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-mono text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors">
              <Upload className="size-3" /> Import
            </button>
            <button type="button" onClick={resetTheme} className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-mono text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors">
              <RotateCcw className="size-3" /> Reset
            </button>
            {importError && <span className="text-[10px] font-mono text-red-400">{importError}</span>}
          </div>
          <div className="flex items-center gap-2">
            {savedMsg && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-accent">
                <Check className="size-3" /> {savedMsg}
              </span>
            )}
            <button type="button" onClick={handleSaveCustom} className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-accent text-[10px] font-mono font-medium text-white hover:bg-accent-hover transition-colors">
              <Save className="size-3" /> Save Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
