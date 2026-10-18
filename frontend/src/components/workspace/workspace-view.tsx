import { Outlet, useLocation } from 'react-router-dom'
import { useWorkspaceLayout, getAllLeafPanels, type DropZone } from '@/store/workspace-layout'
import { SplitContainer } from './split-container'
import { PanelContainer } from './panel-container'
import { pathToToolId } from './panel-registry'
import { DropZonesOverlay } from './drop-zones-overlay'

export function WorkspaceView() {
  const {
    layout,
    isSplitActive,
    maximizedPanelId,
    openInSplit,
    isDraggingTool,
    draggedTool,
    setIsDraggingTool,
  } = useWorkspaceLayout()

  const location = useLocation()

  // Full-page configuration routes like /settings should always render via Outlet
  if (location.pathname.startsWith('/settings')) {
    return (
      <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </div>
    )
  }

  // If a panel is maximized in split view, show only that panel
  if (isSplitActive && layout) {
    if (maximizedPanelId) {
      const leaves = getAllLeafPanels(layout)
      const target = leaves.find(l => l.id === maximizedPanelId)
      if (target) {
        return (
          <div className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-workspace">
            <PanelContainer node={target} />
          </div>
        )
      }
    }

    return (
      <div className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-workspace">
        <SplitContainer node={layout} />
      </div>
    )
  }

  // Single Page View (<Outlet />) with prominent drag-to-split drop zones
  const handleSingleViewDrop = (zone: DropZone) => {
    if (!draggedTool) return
    const currentTool = pathToToolId(location.pathname)
    const direction = zone === 'left' ? 'left' : zone === 'bottom' ? 'bottom' : zone === 'top' ? 'top' : 'right'
    openInSplit(draggedTool, currentTool, direction)
    setIsDraggingTool(false, null)
  }

  return (
    <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
      {isDraggingTool && (
        <DropZonesOverlay
          mode="workspace"
          toolId={draggedTool}
          onDrop={handleSingleViewDrop}
        />
      )}
      <Outlet />
    </div>
  )
}

