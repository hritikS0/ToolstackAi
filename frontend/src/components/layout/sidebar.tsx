import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  MessageSquare, History, Settings, Mail,
  PanelLeftClose, PanelLeft, Palette, BrainCircuit, Images,
  ChevronDown, ChevronRight, Plus, Trophy, CheckSquare, Flame, StickyNote, FolderOpen,
  Pin, Trash2, Loader2, MoreHorizontal, Columns2, GripVertical
} from 'lucide-react'
import { chatService } from '@/services/chat.service'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import type { Conversation } from '@/types/api'
import { useWorkspaceLayout } from '@/store/workspace-layout'
import type { ToolId } from '@/components/workspace/panel-registry'

const navItems: { id: ToolId; icon: any; label: string; path: string }[] = [
  { id: 'mail', icon: Mail, label: 'Mail', path: '/mail' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { id: 'habits', icon: Flame, label: 'Habits', path: '/habits' },
  { id: 'projects', icon: FolderOpen, label: 'Projects', path: '/projects' },
  { id: 'notes', icon: StickyNote, label: 'Notes', path: '/notes' },
  { id: 'goals', icon: Trophy, label: 'Goals', path: '/goals' },
  { id: 'media', icon: Images, label: 'Media', path: '/media' },
  { id: 'brain', icon: BrainCircuit, label: 'Brain', path: '/brain' },
  { id: 'conversations', icon: History, label: 'History', path: '/conversations' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
]

export function Sidebar({ collapsed, onToggle, onThemeClick }: { collapsed: boolean; onToggle: () => void; onThemeClick: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isSplitActive, activePanelId, allPanels, setActivePanel, replaceTool, openInSplit, setIsDraggingTool } = useWorkspaceLayout()

  const handleToolClick = (path: string, toolId: ToolId) => {
    if (isSplitActive) {
      // 1. If tool is already open in one of the split panels, give it first priority (focus it)!
      const existingPanel = allPanels.find(p => p.toolId === toolId)
      if (existingPanel) {
        setActivePanel(existingPanel.id)
        return
      }

      // 2. Otherwise, replace the active panel (or default to the first priority primary panel)
      const targetPanelId = activePanelId || allPanels[0]?.id
      if (targetPanelId) {
        replaceTool(targetPanelId, toolId)
        setActivePanel(targetPanelId)
        return
      }
    }
    navigate(path)
  }

  const [chatExpanded, setChatExpanded] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [contextMenuId, setContextMenuId] = useState<string | null>(null)
  const { addToast } = useToast()

  const activePanel = allPanels.find(p => p.id === activePanelId) || allPanels[0]
  const currentPath = isSplitActive && activePanel
    ? '/' + activePanel.toolId
    : '/' + location.pathname.split('/').filter(Boolean)[0]
  const activeSubId = location.pathname.split('/')[2]

  const PAGE_SIZE = 20

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['conversations', 'sidebar'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await chatService.getConversations(PAGE_SIZE, pageParam as number)
      return res
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((sum, p) => sum + (p.data?.length || 0), 0)
    },
    initialPageParam: 0,
  })

  const allConversations = (data?.pages.flatMap(p => p.data || []) || []) as Conversation[]

  const chatConversations = allConversations
    .filter(c => c.type === 'chat' || c.type === 'pdf' || !c.type)
    .sort((a, b) => {
      const aPinned = a.settings?.pinned ? 1 : 0
      const bPinned = b.settings?.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      const aWelcome = a.settings?.isWelcome ? 1 : 0
      const bWelcome = b.settings?.isWelcome ? 1 : 0
      if (aWelcome !== bWelcome) return bWelcome - aWelcome
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    })

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await chatService.createConversation()
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false })
        navigate(`/chat/${res.data.conversation.id}`)
      }
    } catch { /* navigation handled by router */ }
  }

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => {
      return chatService.updateConversation(id, { settings: { pinned } })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false })
      addToast(variables.pinned ? 'Chat pinned' : 'Chat unpinned')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      if (activeSubId === deleteTarget) navigate('/chat')
      setDeleteTarget(null)
    },
  })

  return (
    <div className={cn(
      'h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-100',
      collapsed ? 'w-[52px]' : 'w-[220px]',
    )}>
      {/* Brand Header */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border h-[41px] shrink-0',
        collapsed ? 'justify-center px-0' : 'px-3',
      )}>
        {!collapsed && (
          <button
            type="button"
            className="text-[14px] font-semibold text-accent tracking-wider uppercase cursor-pointer select-none font-mono focus:outline-none focus:ring-1 focus:ring-accent rounded px-1 text-left" 
            onClick={() => navigate('/dashboard')}
          >ToolStack</button>
        )}
        <div className={collapsed ? '' : 'flex-1'} />
        <button type="button"
          onClick={onToggle}
          className="size-7 rounded-[4px] flex items-center justify-center text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto space-y-4">
        
        {/* Expanded Expandable Sections */}
        {!collapsed ? (
          <div className="space-y-3 px-2">
            {/* Chat Group */}
            <div className="space-y-1">
              <div 
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-toolstack-tool', 'chat')
                  e.dataTransfer.setData('text/plain', 'chat')
                  e.dataTransfer.effectAllowed = 'copyMove'
                  setIsDraggingTool(true, 'chat')
                }}
                onDragEnd={() => setIsDraggingTool(false)}
                onClick={() => handleToolClick('/chat', 'chat')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToolClick('/chat', 'chat')
                  }
                }}
                className={cn(
                  "group flex items-center justify-between h-7 px-2 rounded-[4px] text-[11px] font-semibold text-base-400 hover:text-base-200 hover:bg-base-800/40 cursor-pointer select-none transition-colors focus:outline-none focus:ring-1 focus:ring-accent-muted",
                  location.pathname === '/chat' && "bg-base-800/60 text-base-100"
                )}
                title="Click to open • Drag to split screen"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical className="size-2.5 text-base-600 opacity-0 group-hover:opacity-100 -ml-0.5 transition-opacity cursor-grab shrink-0" />
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setChatExpanded(!chatExpanded)
                    }}
                    className="p-0.5 rounded hover:bg-base-700 text-base-500 hover:text-base-300 transition-colors"
                  >
                    {chatExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  </button>
                  <MessageSquare className="size-3.5 text-base-400" />
                  <span className="font-mono truncate uppercase tracking-wider">Chat</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openInSplit('chat')
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-base-700 text-base-400 hover:text-accent transition-all"
                    title="Open Chat in Split View"
                  >
                    <Columns2 className="size-3" />
                  </button>
                  <button 
                    type="button"
                    onClick={handleNewChat}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-base-700 text-base-400 hover:text-accent transition-all"
                    title="New Chat"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {chatExpanded && (
                <div className="pl-4 space-y-0.5 border-l border-base-850/60 ml-3.5 mt-0.5">
                  {chatConversations.map(c => {
                    const active = activeSubId === c.id
                    const isPinned = !!c.settings?.pinned
                    const menuOpen = contextMenuId === c.id
                    return (
                      <div key={c.id} className="relative">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (isSplitActive) {
                              const chatPanel = allPanels.find(p => p.toolId === 'chat')
                              if (chatPanel) {
                                setActivePanel(chatPanel.id)
                              } else {
                                const targetPanelId = activePanelId || allPanels[0]?.id
                                if (targetPanelId) {
                                  replaceTool(targetPanelId, 'chat')
                                  setActivePanel(targetPanelId)
                                }
                              }
                            }
                            navigate(`/chat/${c.id}`)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (isSplitActive) {
                                const chatPanel = allPanels.find(p => p.toolId === 'chat')
                                if (chatPanel) {
                                  setActivePanel(chatPanel.id)
                                } else {
                                  const targetPanelId = activePanelId || allPanels[0]?.id
                                  if (targetPanelId) {
                                    replaceTool(targetPanelId, 'chat')
                                    setActivePanel(targetPanelId)
                                  }
                                }
                              }
                              navigate(`/chat/${c.id}`)
                            }
                          }}
                          className={cn(
                            "w-full text-left truncate px-3 py-1.5 rounded text-[12px] font-mono flex items-center gap-1.5 group cursor-pointer select-none",
                            active
                              ? "bg-accent-muted text-accent font-medium"
                              : cn(
                                  "text-base-400 hover:text-base-200 hover:bg-base-800/30",
                                  isPinned && !active && "text-base-300 bg-accent-muted/10"
                                )
                          )}
                          title={c.title || 'Conversation'}
                        >
                          <Pin className={cn(
                            "size-2.5 shrink-0 text-accent/50 transition-opacity",
                            isPinned ? "opacity-100" : "invisible"
                          )} />
                          <span className="truncate flex-1">{c.title || 'Conversation'}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setContextMenuId(menuOpen ? null : c.id)
                            }}
                            className={cn(
                              "size-5 rounded flex items-center justify-center transition-all shrink-0",
                              "opacity-0 group-hover:opacity-100",
                              menuOpen
                                ? "opacity-100 bg-base-700 text-base-300"
                                : "text-base-600 hover:text-base-300 hover:bg-base-700"
                            )}
                            title="Actions"
                          >
                            <MoreHorizontal className="size-3" />
                          </button>
                        </div>
                        {menuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setContextMenuId(null)} />
                            <div className="absolute right-0 top-full mt-0.5 z-20 bg-surface border border-base-800 rounded-[4px] py-0.5 shadow-lg min-w-[100px] font-mono text-[11px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  pinMutation.mutate({ id: c.id, pinned: !isPinned })
                                  setContextMenuId(null)
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-base-800/50 text-base-300 flex items-center gap-1.5"
                              >
                                <Pin className="size-3" />
                                {isPinned ? 'Unpin' : 'Pin'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget(c.id)
                                  setContextMenuId(null)
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-base-800/50 text-red-400 flex items-center gap-1.5"
                              >
                                <Trash2 className="size-3" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                  {chatConversations.length === 0 && (
                    <span className="text-[10px] text-base-600 italic px-3 block font-mono">No recent chats</span>
                  )}
                  {hasNextPage && (
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full text-left px-3 py-1.5 rounded text-[11px] font-mono text-base-500 hover:text-base-300 hover:bg-base-800/40 transition-colors disabled:opacity-40"
                    >
                      {isFetchingNextPage ? (
                        <span className="flex items-center gap-1"><Loader2 className="size-2.5 animate-spin" /> Loading...</span>
                      ) : (
                        'Load more...'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed Icons for Chat */
          <div className="space-y-1.5">
            <div
              role="button"
              tabIndex={0}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-toolstack-tool', 'chat')
                e.dataTransfer.setData('text/plain', 'chat')
                e.dataTransfer.effectAllowed = 'copyMove'
                setIsDraggingTool(true, 'chat')
              }}
              onDragEnd={() => setIsDraggingTool(false, null)}
              onClick={() => handleToolClick('/chat', 'chat')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleToolClick('/chat', 'chat')
                }
              }}
              className={cn(
                'flex items-center justify-center w-full h-10 text-sm transition-colors cursor-grab active:cursor-grabbing relative group select-none',
                currentPath === '/chat' ? 'text-base-100 bg-accent-muted' : 'text-base-400 hover:text-base-200 hover:bg-base-800/50'
              )}
              title="Chat • Drag to split screen"
            >
              <MessageSquare className="size-4 shrink-0" />
              <div className="absolute rounded-full bg-accent left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute left-full ml-2 px-2 py-1 rounded-[4px] bg-base-900 border border-base-800 text-[13px] text-base-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                Chat
              </div>
            </div>
          </div>
        )}

        {/* Regular Sidebar Links */}
        <div className={cn("space-y-0.5", !collapsed && "pt-2 border-t border-sidebar-border/40 mx-2")}>
          {navItems.map(item => {
            const active = currentPath === item.path
            return (
              <div
                key={item.path}
                role="button"
                tabIndex={0}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-toolstack-tool', item.id)
                  e.dataTransfer.setData('text/plain', item.id)
                  e.dataTransfer.effectAllowed = 'copyMove'
                  setIsDraggingTool(true, item.id)
                }}
                onDragEnd={() => setIsDraggingTool(false, null)}
                onClick={() => handleToolClick(item.path, item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToolClick(item.path, item.id)
                  }
                }}
                className={cn(
                  'group relative flex items-center w-full text-sm transition-colors cursor-grab active:cursor-grabbing select-none',
                  collapsed ? 'justify-center h-10' : 'px-2.5 h-9 rounded-[4px]',
                  active
                    ? 'text-base-100 bg-accent-muted'
                    : 'text-base-400 hover:text-base-200 hover:bg-base-800/50',
                )}
                title={collapsed ? `${item.label} • Drag to split` : 'Click to open • Drag to split screen'}
              >
                {!collapsed && (
                  <GripVertical className="size-3 text-base-600 opacity-0 group-hover:opacity-100 -ml-1 mr-1 transition-opacity shrink-0" />
                )}
                <item.icon className="size-4 shrink-0" />
                {!collapsed && (
                  <span className="truncate text-[13px] font-mono tracking-wide flex-1 text-left ml-2">
                    {item.label}
                  </span>
                )}
                {active && (
                  <span className={cn(
                    'absolute rounded-full bg-accent',
                    collapsed ? 'left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5' : 'left-0 top-1/2 -translate-y-1/2 w-0.5 h-5',
                  )} />
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded-[4px] bg-base-900 border border-base-800 text-[13px] text-base-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}

                {!collapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openInSplit(item.id)
                    }}
                    className="absolute right-1 size-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-base-700 text-base-400 hover:text-accent transition-all z-10"
                    title={`Open ${item.label} side-by-side in split panel`}
                  >
                    <Columns2 className="size-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer / Theme Trigger */}
      <div className="border-t border-sidebar-border py-1">
        <button type="button"
          onClick={onThemeClick}
          className={cn(
            'flex items-center gap-2.5 w-full text-sm transition-colors group',
            collapsed ? 'justify-center h-10' : 'px-3 h-9',
            'text-base-400 hover:text-base-200 hover:bg-base-800/50',
          )}
          title={collapsed ? 'Theme' : undefined}
        >
          <Palette className="size-4 shrink-0" />
          {!collapsed && <span className="truncate text-[13px] font-mono tracking-wide">Theme</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 rounded-[4px] bg-base-900 border border-base-800 text-[13px] text-base-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
              Theme
            </div>
          )}
        </button>
      </div>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget) }}
        title="Delete conversation"
        message="This will permanently delete the conversation and all its messages."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
