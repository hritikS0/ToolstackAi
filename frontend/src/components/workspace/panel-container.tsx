import { useState, useRef, Suspense } from 'react'
import {
  GripVertical,
  ChevronDown,
  Columns2,
  Rows2,
  Maximize2,
  Minimize2,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOOLS, type ToolId } from './panel-registry'
import { useWorkspaceLayout, type LeafPanel, type DropZone } from '@/store/workspace-layout'
import { DropZonesOverlay } from './drop-zones-overlay'

interface PanelContainerProps {
  node: LeafPanel
}

export function PanelContainer({ node }: PanelContainerProps) {
  const {
    activePanelId,
    maximizedPanelId,
    setActivePanel,
    toggleMaximize,
    closePanel,
    replaceTool,
    splitPanel,
    panelCount,
    isDraggingTool,
    draggedTool,
    setIsDraggingTool,
  } = useWorkspaceLayout()

  const [toolMenuOpen, setToolMenuOpen] = useState(false)
  const [splitMenuOpen, setSplitMenuOpen] = useState<'right' | 'bottom' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const toolMeta = TOOLS[node.toolId] || TOOLS.chat
  const ToolComponent = toolMeta.Component
  const Icon = toolMeta.icon
  const isActive = activePanelId === node.id
  const isMaximized = maximizedPanelId === node.id

  const handlePanelDrop = (zone: DropZone) => {
    if (!draggedTool) return
    splitPanel(node.id, draggedTool, zone)
    setIsDraggingTool(false, null)
  }

  return (
    <div
      ref={containerRef}
      onClick={() => setActivePanel(node.id)}
      className={cn(
        'relative flex flex-col h-full w-full min-h-0 min-w-0 bg-workspace overflow-hidden border transition-colors',
        isActive ? 'border-accent/40 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]' : 'border-base-800/80'
      )}
    >
      {/* Drop feedback overlay */}
      {isDraggingTool && (
        <DropZonesOverlay
          mode="panel"
          toolId={draggedTool}
          onDrop={handlePanelDrop}
        />
      )}

      {/* Panel Top Title Bar */}
      <div className="h-8 px-2 bg-surface/90 border-b border-base-800 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing text-base-500 hover:text-base-300 p-0.5 rounded"
            title="Panel Handle"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('application/x-toolstack-tool', node.toolId)
            }}
          >
            <GripVertical className="size-3" />
          </div>

          {/* Tool Selector Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setToolMenuOpen(!toolMenuOpen)
              }}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-base-800 text-[11px] font-mono font-medium text-base-200 transition-colors"
            >
              <Icon className="size-3.5 text-accent" />
              <span className="truncate max-w-[120px]">{toolMeta.label}</span>
              <ChevronDown className="size-3 text-base-500" />
            </button>

            {/* Tool Selector Popover */}
            {toolMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={e => {
                    e.stopPropagation()
                    setToolMenuOpen(false)
                  }}
                />
                <div className="absolute left-0 top-full mt-1 w-44 rounded-md border border-base-800 bg-surface shadow-2xl z-40 py-1 font-mono text-[11px]">
                  <div className="px-2 py-1 text-[10px] text-base-500 uppercase tracking-wider font-semibold border-b border-base-800/60 mb-1">
                    Switch Tool
                  </div>
                  {Object.values(TOOLS).map(tool => {
                    const ToolIcon = tool.icon
                    const isCurrent = tool.id === node.toolId
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          replaceTool(node.id, tool.id)
                          setToolMenuOpen(false)
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-base-800 transition-colors',
                          isCurrent ? 'text-accent font-semibold bg-accent/5' : 'text-base-300'
                        )}
                      >
                        <ToolIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{tool.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panel Action Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Split Right */}
          <div className="relative">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setSplitMenuOpen(splitMenuOpen === 'right' ? null : 'right')
              }}
              className="size-6 rounded flex items-center justify-center text-base-500 hover:text-base-200 hover:bg-base-800 transition-colors"
              title="Split Panel Right"
            >
              <Columns2 className="size-3" />
            </button>

            {splitMenuOpen === 'right' && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={e => {
                    e.stopPropagation()
                    setSplitMenuOpen(null)
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-base-800 bg-surface shadow-2xl z-40 py-1 font-mono text-[11px]">
                  <div className="px-2 py-1 text-[10px] text-base-500 uppercase tracking-wider font-semibold border-b border-base-800/60 mb-1">
                    Split Right With
                  </div>
                  {Object.values(TOOLS).map(tool => {
                    const ToolIcon = tool.icon
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          splitPanel(node.id, tool.id, 'right')
                          setSplitMenuOpen(null)
                        }}
                        className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-base-800 text-base-300 transition-colors"
                      >
                        <ToolIcon className="size-3.5 shrink-0 text-base-400" />
                        <span className="truncate">{tool.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Split Down */}
          <div className="relative">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setSplitMenuOpen(splitMenuOpen === 'bottom' ? null : 'bottom')
              }}
              className="size-6 rounded flex items-center justify-center text-base-500 hover:text-base-200 hover:bg-base-800 transition-colors"
              title="Split Panel Down"
            >
              <Rows2 className="size-3" />
            </button>

            {splitMenuOpen === 'bottom' && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={e => {
                    e.stopPropagation()
                    setSplitMenuOpen(null)
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-base-800 bg-surface shadow-2xl z-40 py-1 font-mono text-[11px]">
                  <div className="px-2 py-1 text-[10px] text-base-500 uppercase tracking-wider font-semibold border-b border-base-800/60 mb-1">
                    Split Down With
                  </div>
                  {Object.values(TOOLS).map(tool => {
                    const ToolIcon = tool.icon
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          splitPanel(node.id, tool.id, 'bottom')
                          setSplitMenuOpen(null)
                        }}
                        className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-base-800 text-base-300 transition-colors"
                      >
                        <ToolIcon className="size-3.5 shrink-0 text-base-400" />
                        <span className="truncate">{tool.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Maximize / Restore */}
          {panelCount > 1 && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                toggleMaximize(node.id)
              }}
              className="size-6 rounded flex items-center justify-center text-base-500 hover:text-base-200 hover:bg-base-800 transition-colors"
              title={isMaximized ? 'Restore Split' : 'Maximize Panel'}
            >
              {isMaximized ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
            </button>
          )}

          {/* Close Panel */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              closePanel(node.id)
            }}
            className="size-6 rounded flex items-center justify-center text-base-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Close Panel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Inner Body */}
      <div className="flex-1 w-full min-h-0 min-w-0 overflow-hidden relative">
        <Suspense
          fallback={
            <div className="h-full w-full flex items-center justify-center bg-workspace/50">
              <Loader2 className="size-5 animate-spin text-accent" />
            </div>
          }
        >
          {node.toolId === 'chat' ? (
            <ToolComponent conversationId={node.conversationId} />
          ) : (
            <ToolComponent />
          )}
        </Suspense>
      </div>
    </div>
  )
}

