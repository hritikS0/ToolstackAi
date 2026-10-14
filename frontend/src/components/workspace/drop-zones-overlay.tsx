import { useState, type DragEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Replace, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOOLS, type ToolId } from './panel-registry'
import type { DropZone } from '@/store/workspace-layout'

interface DropZonesOverlayProps {
  onDrop: (zone: DropZone) => void
  toolId?: ToolId | null
  mode?: 'panel' | 'workspace'
}

export function DropZonesOverlay({ onDrop, toolId, mode = 'workspace' }: DropZonesOverlayProps) {
  const [hoveredZone, setHoveredZone] = useState<DropZone | null>(null)
  const tool = toolId ? TOOLS[toolId] : null
  const toolName = tool ? tool.label : 'Tool'

  const handleZoneDragOver = (e: DragEvent<HTMLDivElement>, zone: DropZone) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (hoveredZone !== zone) {
      setHoveredZone(zone)
    }
  }

  const handleZoneDrop = (e: DragEvent<HTMLDivElement>, zone: DropZone) => {
    e.preventDefault()
    e.stopPropagation()
    setHoveredZone(null)
    onDrop(zone)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      className="absolute inset-0 z-50 pointer-events-auto bg-base-950/60 backdrop-blur-[2px] select-none flex flex-col p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full h-full rounded-lg border-2 border-dashed border-base-700 bg-base-950/50 overflow-hidden flex flex-col">
        
        {/* Top Drop Zone */}
        <div
          onDragOver={(e) => handleZoneDragOver(e, 'top')}
          onDragLeave={() => setHoveredZone(null)}
          onDrop={(e) => handleZoneDrop(e, 'top')}
          className={cn(
            'h-1/4 w-full flex items-center justify-center border-b border-base-800 transition-all duration-100 cursor-pointer',
            hoveredZone === 'top'
              ? 'bg-accent/25 border-accent text-accent font-semibold shadow-inner'
              : 'hover:bg-base-900/60 text-base-500'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-950/80 border border-base-800 text-xs font-mono">
            <ArrowUp className="size-4 text-accent" />
            <span>Dock {toolName} Top</span>
          </div>
        </div>

        {/* Middle Row (Left, Center, Right) */}
        <div className="flex-1 flex w-full min-h-0">
          {/* Left Drop Zone */}
          <div
            onDragOver={(e) => handleZoneDragOver(e, 'left')}
            onDragLeave={() => setHoveredZone(null)}
            onDrop={(e) => handleZoneDrop(e, 'left')}
            className={cn(
              'w-1/3 h-full flex items-center justify-center border-r border-base-800 transition-all duration-100 cursor-pointer',
              hoveredZone === 'left'
                ? 'bg-accent/25 border-accent text-accent font-semibold shadow-inner'
                : 'hover:bg-base-900/60 text-base-500'
            )}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-950/80 border border-base-800 text-xs font-mono">
              <ArrowLeft className="size-4 text-accent" />
              <span>Dock {toolName} Left</span>
            </div>
          </div>

          {/* Center Zone */}
          <div
            onDragOver={(e) => handleZoneDragOver(e, 'center')}
            onDragLeave={() => setHoveredZone(null)}
            onDrop={(e) => handleZoneDrop(e, 'center')}
            className={cn(
              'w-1/3 h-full flex items-center justify-center transition-all duration-100 cursor-pointer',
              hoveredZone === 'center'
                ? 'bg-accent/20 border-2 border-accent text-accent font-semibold shadow-inner'
                : 'hover:bg-base-900/40 text-base-400'
            )}
          >
            <div className="flex flex-col items-center gap-1.5 text-center px-4 py-2 rounded-xl bg-base-950/90 border border-base-800">
              {mode === 'workspace' ? (
                <>
                  <Columns2 className="size-6 text-accent animate-pulse" />
                  <span className="text-xs font-mono font-medium text-base-200">
                    Split Side-by-Side with {toolName}
                  </span>
                  <span className="text-[10px] font-mono text-base-500">
                    Release to open as a dockable window
                  </span>
                </>
              ) : (
                <>
                  <Replace className="size-6 text-accent" />
                  <span className="text-xs font-mono font-medium text-base-200">
                    Open {toolName} in this panel
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Drop Zone */}
          <div
            onDragOver={(e) => handleZoneDragOver(e, 'right')}
            onDragLeave={() => setHoveredZone(null)}
            onDrop={(e) => handleZoneDrop(e, 'right')}
            className={cn(
              'w-1/3 h-full flex items-center justify-center border-l border-base-800 transition-all duration-100 cursor-pointer',
              hoveredZone === 'right'
                ? 'bg-accent/25 border-accent text-accent font-semibold shadow-inner'
                : 'hover:bg-base-900/60 text-base-500'
            )}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-950/80 border border-base-800 text-xs font-mono">
              <ArrowRight className="size-4 text-accent" />
              <span>Dock {toolName} Right</span>
            </div>
          </div>
        </div>

        {/* Bottom Drop Zone */}
        <div
          onDragOver={(e) => handleZoneDragOver(e, 'bottom')}
          onDragLeave={() => setHoveredZone(null)}
          onDrop={(e) => handleZoneDrop(e, 'bottom')}
          className={cn(
            'h-1/4 w-full flex items-center justify-center border-t border-base-800 transition-all duration-100 cursor-pointer',
            hoveredZone === 'bottom'
              ? 'bg-accent/25 border-accent text-accent font-semibold shadow-inner'
              : 'hover:bg-base-900/60 text-base-500'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-950/80 border border-base-800 text-xs font-mono">
            <ArrowDown className="size-4 text-accent" />
            <span>Dock {toolName} Bottom</span>
          </div>
        </div>

      </div>
    </div>
  )
}

