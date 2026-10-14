import { useState, useRef, useCallback, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspaceLayout, type PanelNode, type SplitPanel } from '@/store/workspace-layout'
import { PanelContainer } from './panel-container'

interface SplitGutterProps {
  split: SplitPanel
}

function SplitGutter({ split }: SplitGutterProps) {
  const { setSplitRatio } = useWorkspaceLayout()
  const [isDragging, setIsDragging] = useState(false)
  const [currentRatio, setCurrentRatio] = useState(split.ratio)
  const containerRef = useRef<HTMLDivElement>(null)

  const isHorizontal = split.direction === 'horizontal'

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      setIsDragging(true)
      setCurrentRatio(split.ratio)

      const parentEl = target.parentElement
      if (!parentEl) return
      const rect = parentEl.getBoundingClientRect()

      const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
        let newRatio = 0.5
        if (isHorizontal) {
          const x = moveEvent.clientX - rect.left
          newRatio = Math.max(0.15, Math.min(0.85, x / rect.width))
        } else {
          const y = moveEvent.clientY - rect.top
          newRatio = Math.max(0.15, Math.min(0.85, y / rect.height))
        }

        setCurrentRatio(newRatio)
        setSplitRatio(split.id, newRatio)
      }

      const onPointerUp = (upEvent: globalThis.PointerEvent) => {
        try {
          target.releasePointerCapture(upEvent.pointerId)
        } catch {}
        setIsDragging(false)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [isHorizontal, split.id, split.ratio, setSplitRatio]
  )

  const handleDoubleClick = () => {
    setSplitRatio(split.id, 0.5)
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize • Double click to balance 50/50"
      className={cn(
        'group relative flex items-center justify-center shrink-0 z-30 select-none transition-colors',
        isHorizontal ? 'w-2 -mx-1 cursor-col-resize h-full' : 'h-2 -my-1 cursor-row-resize w-full',
        isDragging && 'bg-accent/20'
      )}
    >
      {/* Visual divider line */}
      <div
        className={cn(
          'transition-all duration-100 rounded-full',
          isHorizontal ? 'w-[2px] h-full' : 'h-[2px] w-full',
          isDragging
            ? 'bg-accent w-[3px]'
            : 'bg-base-800 group-hover:bg-accent/70 group-hover:w-[3px]'
        )}
      />

      {/* Floating Ratio Badge while dragging */}
      {isDragging && (
        <div
          className={cn(
            'absolute pointer-events-none px-2 py-0.5 rounded bg-base-950 border border-accent/40 text-accent font-mono text-[10px] shadow-xl z-50 whitespace-nowrap',
            isHorizontal ? 'top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2'
          )}
        >
          {Math.round(currentRatio * 100)}% / {Math.round((1 - currentRatio) * 100)}%
        </div>
      )}

      {/* Invisible overlay while dragging to prevent pointer event hijacking from iframes/textareas */}
      {isDragging && (
        <div
          className={cn(
            'fixed inset-0 z-50',
            isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize'
          )}
        />
      )}
    </div>
  )
}

interface SplitContainerProps {
  node: PanelNode
}

export function SplitContainer({ node }: SplitContainerProps) {
  if (node.type === 'leaf') {
    return <PanelContainer node={node} />
  }

  const isHorizontal = node.direction === 'horizontal'
  const firstPercent = `${node.ratio * 100}%`
  const secondPercent = `${(1 - node.ratio) * 100}%`

  return (
    <div
      className={cn(
        'relative flex w-full h-full min-h-0 min-w-0 overflow-hidden',
        isHorizontal ? 'flex-row' : 'flex-col'
      )}
    >
      <div
        style={{
          flexBasis: firstPercent,
          flexGrow: 0,
          flexShrink: 0,
          overflow: 'hidden',
        }}
        className="relative min-w-0 min-h-0"
      >
        <SplitContainer node={node.first} />
      </div>

      <SplitGutter split={node} />

      <div
        style={{
          flexBasis: secondPercent,
          flexGrow: 1,
          flexShrink: 1,
          overflow: 'hidden',
        }}
        className="relative min-w-0 min-h-0"
      >
        <SplitContainer node={node.second} />
      </div>
    </div>
  )
}

