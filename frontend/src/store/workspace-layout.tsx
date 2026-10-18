import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { ToolId } from '@/components/workspace/panel-registry'
import { TOOLS } from '@/components/workspace/panel-registry'

export type SplitDirection = 'horizontal' | 'vertical' // horizontal = side-by-side (vertical divider), vertical = stacked (horizontal divider)
export type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center'

export interface LeafPanel {
  type: 'leaf'
  id: string
  toolId: ToolId
  conversationId?: string
}

export interface SplitPanel {
  type: 'split'
  id: string
  direction: SplitDirection
  ratio: number // 0.15 to 0.85
  first: PanelNode
  second: PanelNode
}

export type PanelNode = LeafPanel | SplitPanel

const STORAGE_KEY = 'toolstack-workspace-layout-v1'

function generateId(prefix: 'p' | 's' = 'p'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function getAllLeafPanels(node: PanelNode | null): LeafPanel[] {
  if (!node) return []
  if (node.type === 'leaf') return [node]
  return [...getAllLeafPanels(node.first), ...getAllLeafPanels(node.second)]
}

function findLeaf(node: PanelNode | null, id: string): LeafPanel | null {
  if (!node) return null
  if (node.type === 'leaf') return node.id === id ? node : null
  return findLeaf(node.first, id) || findLeaf(node.second, id)
}

function removeFromTree(node: PanelNode, targetId: string): PanelNode | null {
  if (node.id === targetId) return null
  if (node.type === 'leaf') return node

  const newFirst = removeFromTree(node.first, targetId)
  const newSecond = removeFromTree(node.second, targetId)

  if (!newFirst && !newSecond) return null
  if (!newFirst) return newSecond
  if (!newSecond) return newFirst

  return {
    ...node,
    first: newFirst,
    second: newSecond,
  }
}

function splitInTree(
  node: PanelNode,
  targetId: string,
  newToolId: ToolId,
  direction: 'left' | 'right' | 'top' | 'bottom'
): PanelNode {
  if (node.id === targetId) {
    const newLeaf: LeafPanel = {
      type: 'leaf',
      id: generateId('p'),
      toolId: newToolId,
    }
    const splitDir: SplitDirection = direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical'
    const isFirstNew = direction === 'left' || direction === 'top'
    return {
      type: 'split',
      id: generateId('s'),
      direction: splitDir,
      ratio: 0.5,
      first: isFirstNew ? newLeaf : node,
      second: isFirstNew ? node : newLeaf,
    }
  }

  if (node.type === 'split') {
    return {
      ...node,
      first: splitInTree(node.first, targetId, newToolId, direction),
      second: splitInTree(node.second, targetId, newToolId, direction),
    }
  }

  return node
}

function updateRatioInTree(node: PanelNode, splitId: string, ratio: number): PanelNode {
  if (node.type === 'leaf') return node
  if (node.id === splitId) {
    return { ...node, ratio: Math.min(0.85, Math.max(0.15, ratio)) }
  }
  return {
    ...node,
    first: updateRatioInTree(node.first, splitId, ratio),
    second: updateRatioInTree(node.second, splitId, ratio),
  }
}

function replaceToolInTree(node: PanelNode, panelId: string, newToolId: ToolId): PanelNode {
  if (node.id === panelId && node.type === 'leaf') {
    return { ...node, toolId: newToolId }
  }
  if (node.type === 'split') {
    return {
      ...node,
      first: replaceToolInTree(node.first, panelId, newToolId),
      second: replaceToolInTree(node.second, panelId, newToolId),
    }
  }
  return node
}

function validateNode(node: any): boolean {
  if (!node || typeof node !== 'object') return false
  if (node.type === 'leaf') {
    return typeof node.id === 'string' && typeof node.toolId === 'string' && node.toolId in TOOLS
  }
  if (node.type === 'split') {
    return (
      typeof node.id === 'string' &&
      (node.direction === 'horizontal' || node.direction === 'vertical') &&
      typeof node.ratio === 'number' &&
      validateNode(node.first) &&
      validateNode(node.second)
    )
  }
  return false
}

function loadSavedLayout(): PanelNode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && validateNode(parsed)) {
      if (parsed.type === 'leaf') {
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
        return null
      }
      return parsed
    }
  } catch {}
  return null
}

interface WorkspaceLayoutContextType {
  layout: PanelNode | null
  activePanelId: string | null
  maximizedPanelId: string | null
  isDraggingTool: boolean
  draggedTool: ToolId | null
  allPanels: LeafPanel[]
  panelCount: number
  isSplitActive: boolean

  setIsDraggingTool: (dragging: boolean, tool?: ToolId | null) => void
  setActivePanel: (panelId: string) => void
  toggleMaximize: (panelId: string) => void
  closePanel: (panelId: string) => void
  replaceTool: (panelId: string, newToolId: ToolId) => void
  setSplitRatio: (splitId: string, ratio: number) => void
  splitPanel: (targetPanelId: string, newToolId: ToolId, direction: DropZone) => void
  openInSplit: (newToolId: ToolId, currentToolId?: ToolId, direction?: 'left' | 'right' | 'top' | 'bottom') => void
  resetToSingleView: () => void
  applyPreset: (
    preset: 'split-2-col' | 'split-2-row' | 'split-3-col' | 'split-1-2',
    primaryTool?: ToolId,
    secondaryTool?: ToolId
  ) => void
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextType | null>(null)

export function WorkspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<PanelNode | null>(() => loadSavedLayout())
  const [activePanelId, setActivePanelId] = useState<string | null>(null)
  const [maximizedPanelId, setMaximizedPanelId] = useState<string | null>(null)
  const [isDraggingTool, setIsDraggingToolState] = useState(false)
  const [draggedTool, setDraggedTool] = useState<ToolId | null>(null)

  // Persist layout to localStorage
  useEffect(() => {
    try {
      if (layout) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {}
  }, [layout])

  const allPanels = useMemo(() => getAllLeafPanels(layout), [layout])
  const panelCount = allPanels.length
  const isSplitActive = layout !== null && panelCount > 1

  // Set active panel if current active is closed or invalid
  useEffect(() => {
    if (layout) {
      if (!activePanelId || !allPanels.some(p => p.id === activePanelId)) {
        setActivePanelId(allPanels[0]?.id || null)
      }
      if (maximizedPanelId && !allPanels.some(p => p.id === maximizedPanelId)) {
        setMaximizedPanelId(null)
      }
    } else {
      setActivePanelId(null)
      setMaximizedPanelId(null)
    }
  }, [layout, allPanels, activePanelId, maximizedPanelId])

  const setIsDraggingTool = useCallback((dragging: boolean, tool: ToolId | null = null) => {
    setIsDraggingToolState(dragging)
    setDraggedTool(dragging ? tool : null)
  }, [])

  // Safety net: ensure drag state resets if user drops outside the browser or cancels with Escape
  useEffect(() => {
    const handleGlobalCancel = () => {
      setIsDraggingToolState(false)
      setDraggedTool(null)
    }
    window.addEventListener('dragend', handleGlobalCancel)
    return () => {
      window.removeEventListener('dragend', handleGlobalCancel)
    }
  }, [])

  const setActivePanel = useCallback((panelId: string) => {
    setActivePanelId(panelId)
  }, [])

  const toggleMaximize = useCallback((panelId: string) => {
    setMaximizedPanelId(prev => (prev === panelId ? null : panelId))
  }, [])

  const closePanel = useCallback((panelId: string) => {
    setLayout(prev => {
      if (!prev) return null
      const updated = removeFromTree(prev, panelId)
      if (!updated || updated.type === 'leaf') {
        return null
      }
      return updated
    })
  }, [])

  const replaceTool = useCallback((panelId: string, newToolId: ToolId) => {
    setLayout(prev => {
      if (!prev) return null
      return replaceToolInTree(prev, panelId, newToolId)
    })
  }, [])

  const setSplitRatio = useCallback((splitId: string, ratio: number) => {
    setLayout(prev => {
      if (!prev) return null
      return updateRatioInTree(prev, splitId, ratio)
    })
  }, [])

  const splitPanel = useCallback((targetPanelId: string, newToolId: ToolId, direction: DropZone) => {
    if (direction === 'center') {
      replaceTool(targetPanelId, newToolId)
      return
    }

    setLayout(prev => {
      if (!prev) {
        // initialize split with target
        const p1: LeafPanel = { type: 'leaf', id: generateId('p'), toolId: 'chat' }
        const p2: LeafPanel = { type: 'leaf', id: generateId('p'), toolId: newToolId }
        const isLeftOrTop = direction === 'left' || direction === 'top'
        return {
          type: 'split',
          id: generateId('s'),
          direction: direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical',
          ratio: 0.5,
          first: isLeftOrTop ? p2 : p1,
          second: isLeftOrTop ? p1 : p2,
        }
      }

      return splitInTree(prev, targetPanelId, newToolId, direction)
    })
  }, [replaceTool])

  const openInSplit = useCallback(
    (newToolId: ToolId, currentToolId: ToolId = 'chat', direction: 'left' | 'right' | 'top' | 'bottom' = 'right') => {
      setLayout(prev => {
        if (!prev) {
          const firstTool = currentToolId === newToolId ? (newToolId === 'chat' ? 'notes' : 'chat') : currentToolId
          const p1: LeafPanel = { type: 'leaf', id: generateId('p'), toolId: firstTool }
          const p2: LeafPanel = { type: 'leaf', id: generateId('p'), toolId: newToolId }
          const isLeftOrTop = direction === 'left' || direction === 'top'
          return {
            type: 'split',
            id: generateId('s'),
            direction: direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical',
            ratio: 0.5,
            first: isLeftOrTop ? p2 : p1,
            second: isLeftOrTop ? p1 : p2,
          }
        }

        const target = (activePanelId && findLeaf(prev, activePanelId)) || getAllLeafPanels(prev)[0]
        if (!target) return prev

        return splitInTree(prev, target.id, newToolId, direction)
      })
    },
    [activePanelId]
  )

  const resetToSingleView = useCallback(() => {
    setLayout(null)
    setMaximizedPanelId(null)
    setActivePanelId(null)
  }, [])

  const applyPreset = useCallback(
    (
      preset: 'split-2-col' | 'split-2-row' | 'split-3-col' | 'split-1-2',
      primaryTool: ToolId = 'chat',
      secondaryTool?: ToolId
    ) => {
      const t1 = primaryTool
      const t2 = secondaryTool || (t1 === 'notes' ? 'tasks' : 'notes')
      const t3 = t1 === 'tasks' || t2 === 'tasks' ? 'habits' : 'tasks'

      setMaximizedPanelId(null)

      if (preset === 'split-2-col') {
        setLayout({
          type: 'split',
          id: generateId('s'),
          direction: 'horizontal',
          ratio: 0.5,
          first: { type: 'leaf', id: generateId('p'), toolId: t1 },
          second: { type: 'leaf', id: generateId('p'), toolId: t2 },
        })
      } else if (preset === 'split-2-row') {
        setLayout({
          type: 'split',
          id: generateId('s'),
          direction: 'vertical',
          ratio: 0.5,
          first: { type: 'leaf', id: generateId('p'), toolId: t1 },
          second: { type: 'leaf', id: generateId('p'), toolId: t2 },
        })
      } else if (preset === 'split-3-col') {
        setLayout({
          type: 'split',
          id: generateId('s'),
          direction: 'horizontal',
          ratio: 0.33,
          first: { type: 'leaf', id: generateId('p'), toolId: t1 },
          second: {
            type: 'split',
            id: generateId('s'),
            direction: 'horizontal',
            ratio: 0.5,
            first: { type: 'leaf', id: generateId('p'), toolId: t2 },
            second: { type: 'leaf', id: generateId('p'), toolId: t3 },
          },
        })
      } else if (preset === 'split-1-2') {
        setLayout({
          type: 'split',
          id: generateId('s'),
          direction: 'horizontal',
          ratio: 0.5,
          first: { type: 'leaf', id: generateId('p'), toolId: t1 },
          second: {
            type: 'split',
            id: generateId('s'),
            direction: 'vertical',
            ratio: 0.5,
            first: { type: 'leaf', id: generateId('p'), toolId: t2 },
            second: { type: 'leaf', id: generateId('p'), toolId: t3 },
          },
        })
      }
    },
    []
  )

  const value = useMemo(
    () => ({
      layout,
      activePanelId,
      maximizedPanelId,
      isDraggingTool,
      draggedTool,
      allPanels,
      panelCount,
      isSplitActive,
      setIsDraggingTool,
      setActivePanel,
      toggleMaximize,
      closePanel,
      replaceTool,
      setSplitRatio,
      splitPanel,
      openInSplit,
      resetToSingleView,
      applyPreset,
    }),
    [
      layout,
      activePanelId,
      maximizedPanelId,
      isDraggingTool,
      draggedTool,
      allPanels,
      panelCount,
      isSplitActive,
      setIsDraggingTool,
      setActivePanel,
      toggleMaximize,
      closePanel,
      replaceTool,
      setSplitRatio,
      splitPanel,
      openInSplit,
      resetToSingleView,
      applyPreset,
    ]
  )

  return <WorkspaceLayoutContext.Provider value={value}>{children}</WorkspaceLayoutContext.Provider>
}

export function useWorkspaceLayout() {
  const ctx = useContext(WorkspaceLayoutContext)
  if (!ctx) {
    throw new Error('useWorkspaceLayout must be used within a WorkspaceLayoutProvider')
  }
  return ctx
}

