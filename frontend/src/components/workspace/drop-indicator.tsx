import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Replace } from 'lucide-react'
import type { DropZone } from '@/store/workspace-layout'
import { TOOLS, type ToolId } from './panel-registry'

interface DropIndicatorProps {
  zone: DropZone | null
  toolId?: ToolId | null
}

export function DropIndicator({ zone, toolId }: DropIndicatorProps) {
  if (!zone) return null

  const tool = toolId ? TOOLS[toolId] : null

  const getPositionClass = () => {
    switch (zone) {
      case 'left':
        return 'top-0 left-0 bottom-0 w-1/2'
      case 'right':
        return 'top-0 right-0 bottom-0 w-1/2'
      case 'top':
        return 'top-0 left-0 right-0 h-1/2'
      case 'bottom':
        return 'bottom-0 left-0 right-0 h-1/2'
      case 'center':
      default:
        return 'inset-2'
    }
  }

  const getIcon = () => {
    switch (zone) {
      case 'left':
        return <ArrowLeft className="size-5 text-accent" />
      case 'right':
        return <ArrowRight className="size-5 text-accent" />
      case 'top':
        return <ArrowUp className="size-5 text-accent" />
      case 'bottom':
        return <ArrowDown className="size-5 text-accent" />
      case 'center':
      default:
        return <Replace className="size-5 text-accent" />
    }
  }

  const getLabel = () => {
    const toolName = tool ? tool.label : 'Tool'
    switch (zone) {
      case 'left':
        return `Split Left with ${toolName}`
      case 'right':
        return `Split Right with ${toolName}`
      case 'top':
        return `Split Top with ${toolName}`
      case 'bottom':
        return `Split Bottom with ${toolName}`
      case 'center':
      default:
        return `Open ${toolName} Here`
    }
  }

  return (
    <div
      className={`absolute z-40 pointer-events-none transition-all duration-150 rounded border-2 border-accent/70 bg-accent/15 backdrop-blur-[2px] flex items-center justify-center p-3 shadow-2xl ${getPositionClass()}`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-950/90 border border-accent/40 shadow-lg text-[12px] font-mono text-base-100">
        {getIcon()}
        <span className="font-semibold text-accent">{getLabel()}</span>
      </div>
    </div>
  )
}

