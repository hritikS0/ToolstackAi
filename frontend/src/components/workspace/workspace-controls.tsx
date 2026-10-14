import { useState, useRef, useEffect } from 'react'
import {
  Columns2,
  Rows2,
  Columns3,
  LayoutGrid,
  Maximize2,
  ChevronDown,
  Layers,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceLayout } from '@/store/workspace-layout'
import { pathToToolId } from './panel-registry'
import { useLocation } from 'react-router-dom'

export function WorkspaceControls() {
  const {
    isSplitActive,
    panelCount,
    resetToSingleView,
    applyPreset,
    maximizedPanelId,
    toggleMaximize,
  } = useWorkspaceLayout()

  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentTool = pathToToolId(location.pathname)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-[4px] text-[11px] font-mono transition-all',
          isSplitActive
            ? 'bg-accent/15 border border-accent/40 text-accent font-medium hover:bg-accent/20'
            : 'text-base-400 hover:text-base-200 hover:bg-base-800'
        )}
        title="Workspace Layout Settings"
      >
        <Layers className="size-3.5 shrink-0" />
        <span className="hidden sm:inline">
          {isSplitActive ? `Split (${panelCount})` : 'Layout'}
        </span>
        <ChevronDown className="size-3 opacity-60" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-md border border-base-800 bg-surface shadow-2xl z-50 py-1.5 font-mono text-[11px]">
          <div className="px-3 py-1 text-[10px] text-base-500 uppercase tracking-wider font-semibold border-b border-base-800/60 mb-1 flex items-center justify-between">
            <span>Workspace Layout</span>
            {isSplitActive && (
              <span className="text-accent">{panelCount} active</span>
            )}
          </div>

          {/* Single view option */}
          <button
            type="button"
            onClick={() => {
              resetToSingleView()
              setMenuOpen(false)
            }}
            className={cn(
              'w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 transition-colors',
              !isSplitActive ? 'text-accent font-semibold bg-accent/5' : 'text-base-300'
            )}
          >
            <Maximize2 className="size-3.5 text-base-400" />
            <span>Single View</span>
            {!isSplitActive && <span className="ml-auto text-[9px] text-accent">Active</span>}
          </button>

          <div className="my-1 border-t border-base-800/60" />

          <div className="px-3 py-1 text-[10px] text-base-500 uppercase tracking-wider font-semibold">
            Split Presets
          </div>

          {/* 2 Columns */}
          <button
            type="button"
            onClick={() => {
              applyPreset('split-2-col', currentTool)
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 text-base-300 transition-colors"
          >
            <Columns2 className="size-3.5 text-base-400" />
            <span>Side by Side (2 Col)</span>
          </button>

          {/* 2 Rows */}
          <button
            type="button"
            onClick={() => {
              applyPreset('split-2-row', currentTool)
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 text-base-300 transition-colors"
          >
            <Rows2 className="size-3.5 text-base-400" />
            <span>Stacked (2 Rows)</span>
          </button>

          {/* 3 Columns */}
          <button
            type="button"
            onClick={() => {
              applyPreset('split-3-col', currentTool)
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 text-base-300 transition-colors"
          >
            <Columns3 className="size-3.5 text-base-400" />
            <span>3 Columns</span>
          </button>

          {/* 1 Left, 2 Right */}
          <button
            type="button"
            onClick={() => {
              applyPreset('split-1-2', currentTool)
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 text-base-300 transition-colors"
          >
            <LayoutGrid className="size-3.5 text-base-400" />
            <span>1 Main + 2 Stacked</span>
          </button>

          {isSplitActive && (
            <>
              <div className="my-1 border-t border-base-800/60" />
              {maximizedPanelId && (
                <button
                  type="button"
                  onClick={() => {
                    toggleMaximize(maximizedPanelId)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 text-yellow-400 transition-colors"
                >
                  <Sparkles className="size-3.5" />
                  <span>Restore Splits</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  resetToSingleView()
                  setMenuOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-base-800 text-red-400 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                <span>Exit Split Mode</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

