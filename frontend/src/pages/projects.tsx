import { useState, useReducer } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen, Plus, Trash2, Edit3, Loader2, Folder, Code, BookOpen, Heart,
  Wrench, Sparkles, ChevronRight, CheckCircle2, Circle, Calendar,
  ListTodo, Trophy, Flame
} from 'lucide-react'
import { projectsService } from '@/services/projects.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Project, Task, Goal, Habit } from '@/types/api'

const PRESET_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#10b981', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
]

const PRESET_ICONS = [
  { value: 'folder', icon: Folder },
  { value: 'code', icon: Code },
  { value: 'book-open', icon: BookOpen },
  { value: 'heart', icon: Heart },
  { value: 'wrench', icon: Wrench },
  { value: 'sparkles', icon: Sparkles },
]

interface FormState {
  name: string
  description: string
  color: string
  icon: string
}

type FormAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_COLOR'; payload: string }
  | { type: 'SET_ICON'; payload: string }
  | { type: 'RESET_FORM' }
  | { type: 'SET_FORM'; payload: FormState }

const initialFormState: FormState = {
  name: '',
  description: '',
  color: '#3b82f6',
  icon: 'folder',
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload }
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload }
    case 'SET_COLOR':
      return { ...state, color: action.payload }
    case 'SET_ICON':
      return { ...state, icon: action.payload }
    case 'RESET_FORM':
      return initialFormState
    case 'SET_FORM':
      return action.payload
    default:
      return state
  }
}

export function ProjectsPage() {
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Form states grouped in a reducer
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectsService.list()).data || [],
  })

  // Selected project detail query
  const { data: projectDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['project', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return null
      return (await projectsService.getById(selectedProject.id)).data
    },
    enabled: !!selectedProject?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string; icon?: string }) => projectsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      resetForm()
      setShowCreate(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; color?: string; icon?: string } }) => projectsService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (selectedProject?.id === editingProject?.id) {
        setSelectedProject(res.data)
      }
      resetForm()
      setEditingProject(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (selectedProject?.id === editingProject?.id) {
        setSelectedProject(null)
      }
      setEditingProject(null)
    },
  })

  const resetForm = () => {
    dispatchForm({ type: 'RESET_FORM' })
  }

  const handleCreate = () => {
    if (!formState.name.trim()) return
    createMutation.mutate({
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      color: formState.color,
      icon: formState.icon,
    })
  }

  const handleUpdate = () => {
    if (!editingProject || !formState.name.trim()) return
    updateMutation.mutate({
      id: editingProject.id,
      data: {
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
        color: formState.color,
        icon: formState.icon,
      },
    })
  }

  const getIconComponent = (iconName: string) => {
    const preset = PRESET_ICONS.find(pi => pi.value === iconName)
    return preset ? preset.icon : Folder
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-workspace">
        <Loader2 className="size-5 animate-spin text-base-500" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-workspace">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Projects</h1>
            <span className="text-[10px] text-base-600 font-mono">({projects.length})</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm()
              setShowCreate(true)
            }}
          >
            <Plus className="size-3.5" /> New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Folder className="size-8 text-base-700 mb-2" />
            <p className="text-[11px] text-base-600 font-mono mb-3">No projects yet. Create your first project.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm()
                setShowCreate(true)
              }}
            >
              <Plus className="size-3.5" /> New Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((p: Project) => {
              const ProjectIcon = getIconComponent(p.icon)
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedProject(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedProject(p)
                    }
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-[4px] border border-base-800 bg-surface/50 hover:bg-surface-alt/50 transition-all p-3.5 cursor-pointer group flex flex-col justify-between h-[110px] focus:outline-none focus:ring-1 focus:ring-accent-muted",
                    selectedProject?.id === p.id && "border-accent-muted bg-surface-alt"
                  )}
                  style={{ borderLeft: `3px solid ${p.color || '#3b82f6'}` }}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-[3px] bg-base-800 flex items-center justify-center shrink-0">
                          <ProjectIcon className="size-3.5" style={{ color: p.color }} />
                        </div>
                        <h2 className="text-[14px] font-medium text-base-100 font-mono truncate max-w-[200px]">{p.name}</h2>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingProject(p)
                            dispatchForm({
                              type: 'SET_FORM',
                              payload: {
                                name: p.name,
                                description: p.description || '',
                                color: p.color || '#3b82f6',
                                icon: p.icon || 'folder'
                              }
                            })
                          }}
                          className="size-5 rounded flex items-center justify-center hover:bg-base-800 text-base-500 hover:text-base-300 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this project? Linked items will be unlinked.')) {
                              deleteMutation.mutate(p.id)
                            }
                          }}
                          className="size-5 rounded flex items-center justify-center hover:bg-red-900/20 text-base-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[12px] text-base-400 font-mono line-clamp-2 leading-relaxed pl-8">
                      {p.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-base-500 font-mono pl-8 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <ListTodo className="size-3 text-base-600" /> {p._count?.tasks || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="size-3 text-base-600" /> {p._count?.goals || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="size-3 text-base-600" /> {p._count?.habits || 0}
                      </span>
                    </div>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Project Detail Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setSelectedProject(null)}>
          <div
            className="w-[500px] h-full bg-workspace border-l border-base-800 flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between h-12 px-4 border-b border-base-800 bg-surface">
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color }} />
                <span className="text-[13px] font-medium text-base-100 font-mono uppercase tracking-wider truncate max-w-[350px]">{selectedProject.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="size-6 rounded flex items-center justify-center hover:bg-base-850 text-base-500 hover:text-base-300 transition-colors"
              >
                <Plus className="size-4 rotate-45" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Description</span>
                <p className="text-[13px] text-base-300 font-mono leading-relaxed bg-surface/40 rounded border border-base-800/60 p-2.5">
                  {selectedProject.description || 'No description.'}
                </p>
              </div>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-4 animate-spin text-base-500" />
                </div>
              ) : projectDetail ? (
                <div className="space-y-4">
                  {/* Linked Tasks */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-base-800 pb-1">
                      <ListTodo className="size-3.5 text-base-500" />
                      <span className="text-[11px] font-medium text-base-400 font-mono uppercase tracking-wider">Linked Tasks ({projectDetail.tasks?.length || 0})</span>
                    </div>
                    {projectDetail.tasks && projectDetail.tasks.length > 0 ? (
                      <div className="space-y-1">
                        {projectDetail.tasks.map((t: Task) => (
                          <div key={t.id} className="flex items-center justify-between p-2 rounded bg-surface/30 border border-base-850 text-[12px] font-mono">
                            <span className={cn("text-base-300 truncate max-w-[280px]", t.status === 'done' && "line-through text-base-600")}>{t.title}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-[2px] text-[10px] uppercase font-bold",
                              t.status === 'done' && "bg-emerald-900/20 text-emerald-400",
                              t.status === 'todo' && "bg-base-800 text-base-400",
                              t.status === 'in-progress' && "bg-amber-900/20 text-amber-400"
                            )}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-base-600 font-mono py-1">No linked tasks.</p>
                    )}
                  </div>

                  {/* Linked Goals */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-base-800 pb-1">
                      <Trophy className="size-3.5 text-base-500" />
                      <span className="text-[11px] font-medium text-base-400 font-mono uppercase tracking-wider">Linked Goals ({projectDetail.goals?.length || 0})</span>
                    </div>
                    {projectDetail.goals && projectDetail.goals.length > 0 ? (
                      <div className="space-y-1">
                        {projectDetail.goals.map((g: Goal) => (
                          <div key={g.id} className="flex items-center justify-between p-2 rounded bg-surface/30 border border-base-850 text-[12px] font-mono">
                            <span className={cn("text-base-300 truncate max-w-[280px]", g.status === 'completed' && "line-through text-base-600")}>{g.title}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-[2px] text-[10px] uppercase font-bold",
                              g.status === 'completed' && "bg-emerald-900/20 text-emerald-400",
                              g.status === 'active' && "bg-accent-muted text-accent"
                            )}>{g.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-base-600 font-mono py-1">No linked goals.</p>
                    )}
                  </div>

                  {/* Linked Habits */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-base-800 pb-1">
                      <Flame className="size-3.5 text-base-500" />
                      <span className="text-[11px] font-medium text-base-400 font-mono uppercase tracking-wider">Linked Habits ({projectDetail.habits?.length || 0})</span>
                    </div>
                    {projectDetail.habits && projectDetail.habits.length > 0 ? (
                      <div className="space-y-1">
                        {projectDetail.habits.map((h: Habit) => (
                          <div key={h.id} className="flex items-center justify-between p-2 rounded bg-surface/30 border border-base-850 text-[12px] font-mono">
                            <span className="text-base-300 truncate max-w-[280px]">{h.title}</span>
                            <span className="text-[11px] text-base-500 uppercase">{h.frequency}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-base-600 font-mono py-1">No linked habits.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Creation/Edit Modal */}
      {(showCreate || editingProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowCreate(false); setEditingProject(null) }}>
          <div
            className="w-[420px] rounded-[6px] border border-base-800 bg-surface shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-10 px-3 border-b border-base-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="size-3.5 text-accent" />
                <span className="text-[11px] font-medium text-base-100 font-mono">
                  {editingProject ? 'Edit Project' : 'New Project'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setEditingProject(null) }}
                className="size-5 flex items-center justify-center text-base-500 hover:text-base-200"
              >
                <Plus className="size-3.5 rotate-45" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              <Input
                value={formState.name}
                onChange={e => dispatchForm({ type: 'SET_NAME', payload: e.target.value })}
                placeholder="Project name"
                className="h-8 text-[12px]"
                autoFocus
              />
              <textarea
                value={formState.description}
                onChange={e => dispatchForm({ type: 'SET_DESCRIPTION', payload: e.target.value })}
                placeholder="Description (optional)"
                className="w-full h-16 rounded-[4px] border border-base-800 bg-surface px-2 py-1.5 text-[11px] text-base-100 placeholder:text-base-600 font-mono focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />

              {/* Color Picker */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-base-500 font-mono block">Project Color</span>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => dispatchForm({ type: 'SET_COLOR', payload: c.value })}
                      className={cn(
                        "size-5 rounded-full border border-base-800 transition-all cursor-pointer relative flex items-center justify-center hover:scale-110",
                        formState.color === c.value && "scale-110 border-white/60"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    >
                      {formState.color === c.value && <div className="size-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-base-500 font-mono block">Project Icon</span>
                <div className="flex items-center gap-2">
                  {PRESET_ICONS.map(pi => {
                    const IconComponent = pi.icon
                    return (
                      <button
                        key={pi.value}
                        type="button"
                        onClick={() => dispatchForm({ type: 'SET_ICON', payload: pi.value })}
                        className={cn(
                          "size-8 rounded-[4px] border border-base-800 bg-surface-alt text-base-500 hover:text-base-200 transition-colors cursor-pointer flex items-center justify-center hover:scale-105",
                          formState.icon === pi.value && "border-accent text-accent bg-base-800"
                        )}
                        title={pi.value}
                      >
                        <IconComponent className="size-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowCreate(false); setEditingProject(null) }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={editingProject ? handleUpdate : handleCreate}
                disabled={!formState.name.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {editingProject ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
