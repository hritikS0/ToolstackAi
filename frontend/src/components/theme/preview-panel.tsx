import type { ThemeConfig } from '@/themes/types'

interface PreviewPanelProps {
  theme: ThemeConfig
}

export function PreviewPanel({ theme }: PreviewPanelProps) {
  const c = theme.colors
  const isLight = theme.id === 'paper' || theme.id === 'light'

  return (
    <div className="rounded-[4px] border overflow-hidden" style={{ borderColor: c.border, background: c.background }}>
      <div className="flex h-[180px]">
        <div className="w-10 shrink-0 flex flex-col items-center py-2 gap-1.5" style={{ background: c.sidebar, borderRight: `1px solid ${c.sidebarBorder}` }}>
          <div className="size-1.5 rounded-full" style={{ background: c.accent }} />
          <div className="size-1.5 rounded-full" style={{ background: c.muted }} />
          <div className="size-1.5 rounded-full" style={{ background: c.muted }} />
          <div className="size-1.5 rounded-full" style={{ background: c.muted }} />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between h-7 px-2 border-b" style={{ borderColor: c.border, background: c.surface }}>
            <span className="text-[9px] font-mono" style={{ color: c.muted }}>preview.tsx</span>
            <span className="text-[9px] font-mono" style={{ color: c.accent }}>●</span>
          </div>
          <div className="flex-1 p-2 space-y-1.5">
            <div className="flex items-end gap-2 justify-end">
              <div className="max-w-[65%] rounded-[4px] px-2 py-1 text-[9px] font-mono leading-relaxed"
                style={{ background: isLight ? c.accent + '18' : c.accent + '15', border: `1px solid ${c.accent}33`, color: c.text }}>
                What is the meaning of life?
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="max-w-[75%] rounded-[4px] border px-2 py-1 text-[9px] font-mono leading-relaxed"
                style={{ background: c.surface, borderColor: c.border, color: c.text }}>
                <div className="text-[8px] font-medium mb-0.5" style={{ color: c.accent }}>Assistant</div>
                42
              </div>
            </div>
            <div className="flex items-end gap-2 justify-end">
              <div className="max-w-[65%] rounded-[4px] px-2 py-1 text-[9px] font-mono leading-relaxed"
                style={{ background: isLight ? c.accent + '18' : c.accent + '15', border: `1px solid ${c.accent}33`, color: c.text }}>
                Explain recursion
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="max-w-[75%] rounded-[4px] border px-2 py-1 text-[9px] font-mono leading-relaxed"
                style={{ background: c.surface, borderColor: c.border, color: c.text }}>
                <div className="text-[8px] font-medium mb-0.5" style={{ color: c.accent }}>Assistant</div>
                See "Explain recursion"
              </div>
            </div>
          </div>
          <div className="h-6 flex items-center px-2 border-t gap-1" style={{ borderColor: c.border, background: c.surface }}>
            <div className="flex-1 h-3 rounded-[2px]" style={{ background: c.background }} />
            <div className="h-3 w-6 rounded-[2px]" style={{ background: c.accent }} />
          </div>
        </div>
      </div>
    </div>
  )
}
