import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project.service'
import { chatService } from '@/services/chat.service'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Project, Thread } from '@/types/api'
import {
  FolderOpen, ChevronRight, MessageSquare, Plus, MoreHorizontal,
  Pencil, Trash2, Hash
} from 'lucide-react'

interface Props {
  collapsed: boolean
  onToggle: () => void
  onThemeClick: () => void
}

export function Sidebar({ collapsed, onToggle, onThemeClick }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: chatId } = useParams()
  const queryClient = useQueryClient()
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingThread, setCreatingThread] = useState<string | null>(null)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'project' | 'thread'; id: string } | null>(null)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getAll(),
  })

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await projectService.create({ name: newProjectName.trim() })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    setNewProjectName('')
    setCreatingProject(false)
  }

  const handleCreateThread = async (projectId: string) => {
    if (!newThreadTitle.trim()) return
    const thread = await projectService.createThread({ projectId, title: newThreadTitle.trim() })
    const conv = await chatService.createConversation({ title: newThreadTitle.trim() })
    if (conv.data?.conversation) {
      await projectService.linkConversation(conv.data.conversation.id, thread.id)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/chat/${conv.data.conversation.id}`)
    }
    setNewThreadTitle('')
    setCreatingThread(null)
  }

  const handleRename = async (type: 'project' | 'thread', id: string) => {
    if (!editName.trim()) return
    if (type === 'project') await projectService.update(id, { name: editName.trim() })
    else await projectService.updateThread(id, { title: editName.trim() })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (type: 'project' | 'thread', id: string) => {
    if (type === 'project') await projectService.delete(id)
    else await projectService.deleteThread(id)
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    setContextMenu(null)
  }

  const startEdit = (type: 'project' | 'thread', id: string, currentName: string) => {
    setEditingId(`${type}-${id}`)
    setEditName(currentName)
    setContextMenu(null)
  }

  return (
    <div className={cn(
      'h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-100',
      collapsed ? 'w-[52px]' : 'w-[240px]',
    )}>
      <div className={cn(
        'flex items-center border-b border-sidebar-border h-[41px] shrink-0',
        collapsed ? 'justify-center px-0' : 'px-3',
      )}>
        {!collapsed && (
          <span className="text-[14px] font-medium text-accent tracking-wider uppercase cursor-pointer select-none"
            onClick={() => navigate('/dashboard')}
          >ToolStack</span>
        )}
        <div className={collapsed ? '' : 'flex-1'} />
        <button type="button"
          onClick={onToggle}
          className="size-7 rounded-[4px] flex items-center justify-center text-base-500 hover:text-base-300 hover:bg-base-800 transition-colors"
        >
          <ChevronRight className={cn('size-4 transition-transform', !collapsed && 'rotate-180')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {!collapsed && (
          <div className="px-2 pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[13px] text-base-400 hover:text-base-200"
              onClick={() => setCreatingProject(true)}
            >
              <Plus className="size-3.5 mr-2" />
              New Project
            </Button>
          </div>
        )}

        {creatingProject && !collapsed && (
          <div className="px-2 pb-1">
            <input
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setCreatingProject(false) }}
              onBlur={() => { if (!newProjectName.trim()) setCreatingProject(false); else handleCreateProject() }}
              placeholder="Project name..."
              className="w-full h-7 rounded-[2px] border border-accent/40 bg-base-950 px-2 text-[13px] font-mono text-base-200 outline-none"
            />
          </div>
        )}

        {projects.map(project => {
          const isExpanded = expandedProjects.has(project.id)
          const threads = project.threads || []

          return (
            <div key={project.id} className="mb-0.5">
              <button type="button"
                onClick={() => collapsed ? navigate(`/projects/${project.id}`) : toggleProject(project.id)}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'project', id: project.id }) }}
                className={cn(
                  'flex items-center gap-2 w-full text-left transition-colors group',
                  collapsed ? 'justify-center h-10' : 'px-3 h-9',
                  'text-base-400 hover:text-base-200 hover:bg-base-800/50',
                )}
              >
                <FolderOpen className="size-4 shrink-0" style={{ color: project.color }} />
                {!collapsed && (
                  <>
                    {editingId === `project-${project.id}` ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename('project', project.id); if (e.key === 'Escape') setEditingId(null) }}
                        onBlur={() => handleRename('project', project.id)}
                        className="flex-1 bg-transparent text-[13px] font-mono text-base-200 outline-none border-b border-accent/40"
                      />
                    ) : (
                      <span className="flex-1 truncate text-[13px] font-mono">{project.name}</span>
                    )}
                    <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                  </>
                )}
              </button>

              {isExpanded && !collapsed && (
                <div className="ml-3 border-l border-base-800/50 pl-3">
                  {threads.map(thread => (
                    <div key={thread.id} className="group/thread relative">
                      <button type="button"
                        onClick={() => {
                          const conv = thread.conversations?.[0]
                          if (conv) navigate(`/chat/${conv.id}`)
                        }}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'thread', id: thread.id }) }}
                        className={cn(
                          'flex items-center gap-2 w-full h-8 px-3 text-left transition-colors rounded-[2px]',
                          thread.conversations?.[0]?.id === chatId
                            ? 'text-accent bg-accent-muted'
                            : 'text-base-400 hover:text-base-200 hover:bg-base-800/50',
                        )}
                      >
                        <Hash className="size-3.5 shrink-0" />
                        {editingId === `thread-${thread.id}` ? (
                          <input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename('thread', thread.id); if (e.key === 'Escape') setEditingId(null) }}
                            onBlur={() => handleRename('thread', thread.id)}
                            className="flex-1 bg-transparent text-[13px] font-mono text-base-200 outline-none border-b border-accent/40"
                          />
                        ) : (
                          <span className="flex-1 truncate text-[13px] font-mono">{thread.title}</span>
                        )}
                      </button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setCreatingThread(project.id)}
                    className="flex items-center gap-2 w-full h-8 px-3 text-[12px] text-base-600 hover:text-base-400 transition-colors"
                  >
                    <Plus className="size-3 shrink-0" />
                    New thread
                  </button>
                  {creatingThread === project.id && (
                    <div className="px-3 pb-1">
                      <input
                        autoFocus
                        value={newThreadTitle}
                        onChange={e => setNewThreadTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateThread(project.id); if (e.key === 'Escape') setCreatingThread(null) }}
                        onBlur={() => { if (!newThreadTitle.trim()) setCreatingThread(null); else handleCreateThread(project.id) }}
                        placeholder="Thread title..."
                        className="w-full h-7 rounded-[2px] border border-accent/40 bg-base-950 px-2 text-[12px] font-mono text-base-200 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-sidebar-border py-1">
        <button type="button"
          onClick={onThemeClick}
          className={cn(
            'flex items-center gap-2.5 w-full text-sm transition-colors group',
            collapsed ? 'justify-center h-10' : 'px-3 h-9',
            'text-base-400 hover:text-base-200 hover:bg-base-800/50',
          )}
        >
          <span className="size-4 shrink-0 flex items-center justify-center">🎨</span>
          {!collapsed && <span className="truncate text-[13px] tracking-wide">Theme</span>}
        </button>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 w-40 rounded-[4px] border border-base-800 bg-surface shadow-xl py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button type="button"
              onClick={() => startEdit(contextMenu.type, contextMenu.id, '')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors"
            >
              <Pencil className="size-3.5" />
              Rename
            </button>
            <div className="border-t border-base-800 my-0.5" />
            <button type="button"
              onClick={() => handleDelete(contextMenu.type, contextMenu.id)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
