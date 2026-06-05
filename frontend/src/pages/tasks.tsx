import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksService } from '@/services/tasks.service'
import { projectsService } from '@/services/projects.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { formatRelativeTime } from '@/lib/utils'
import {
  CheckCircle2, Circle, Clock, Flag, Plus, Trash2, Filter,
  Loader2, AlertTriangle, ChevronDown,
} from 'lucide-react'
import type { Task } from '@/types/api'

const statuses = [
  { value: 'todo', label: 'Todo' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
] as const

const priorities = [
  { value: 'low', label: 'Low', color: 'text-emerald-400 bg-emerald-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10' },
  { value: 'high', label: 'High', color: 'text-orange-400 bg-orange-500/10' },
  { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-500/10' },
] as const

const statusColors: Record<string, string> = {
  'todo': 'text-blue-400 bg-blue-500/10',
  'in-progress': 'text-yellow-400 bg-yellow-500/10',
  'done': 'text-emerald-400 bg-emerald-500/10',
  'archived': 'text-base-500 bg-base-700/50',
}

const priorityColors: Record<string, string> = {
  low: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  critical: 'text-red-400 bg-red-500/10',
}

const statusIcons: Record<string, typeof Circle> = {
  'todo': Circle,
  'in-progress': Clock,
  'done': CheckCircle2,
  'archived': Circle,
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const Icon = statusIcons[task.status] || Circle
  const priorityLabel = priorities.find(p => p.value === task.priority)?.label || task.priority
  const statusLabel = statuses.find(s => s.value === task.status)?.label || task.status

  const formatDueDate = (date?: string | null) => {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return `OVERDUE`
    if (diffDays === 0) return `TODAY`
    if (diffDays === 1) return `TOMORROW`
    if (diffDays <= 7) return `${diffDays}d`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const dueStr = formatDueDate(task.dueDate)
  const isOverdue = dueStr === 'OVERDUE'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-[4px] border border-base-800 bg-surface p-3 hover:border-base-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className="size-3.5 mt-0.5 shrink-0 text-base-500" />
          <span className="text-[12px] font-medium text-base-100 font-mono truncate">
            {task.title}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="text-[11px] text-base-500 font-mono line-clamp-2 mb-2 ml-5.5">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap ml-5.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono ${priorityColors[task.priority]}`}>
          <Flag className="size-2.5 mr-1" />
          {priorityLabel}
        </span>

        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono ${statusColors[task.status]}`}>
          {statusLabel}
        </span>

        {dueStr && (
          <span className={`text-[9px] font-mono ${isOverdue ? 'text-red-400' : 'text-base-500'}`}>
            {dueStr}
          </span>
        )}

        {task.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-1 py-0.5 rounded-[2px] text-[9px] font-mono bg-base-800 text-base-400">
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[9px] font-mono text-base-600">+{task.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium' as Task['priority'],
  status: 'todo' as Task['status'],
  dueDate: '',
  tags: '',
  projectId: '',
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const formRef = useRef<HTMLDivElement>(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await tasksService.list({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      })
      return res.data || []
    },
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectsService.list()).data || [],
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowCreate(false)
      setForm({ ...emptyForm })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setEditMode(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setSelectedTask(null)
      setDeleteTarget(null)
    },
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node) && showCreate) {
        if (!createMutation.isPending) setShowCreate(false)
      }
    }
    if (showCreate) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [showCreate, createMutation.isPending])

  const handleSave = () => {
    const tags = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    createMutation.mutate({
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || undefined,
      tags,
      projectId: form.projectId || undefined,
    })
  }

  const handleUpdate = () => {
    if (!selectedTask) return
    updateMutation.mutate({
      id: selectedTask.id,
      data: {
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        status: selectedTask.status,
        dueDate: selectedTask.dueDate || undefined,
        tags: selectedTask.tags,
        projectId: selectedTask.projectId || null,
      },
    })
  }

  const handleStatusChange = (task: Task, newStatus: Task['status']) => {
    updateMutation.mutate({
      id: task.id,
      data: { status: newStatus },
    })
    if (selectedTask?.id === task.id) {
      setSelectedTask({ ...task, status: newStatus })
    }
  }

  const activeStatusFilter = statusFilter || 'all'
  const filtered = activeStatusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === activeStatusFilter)

  const sections = activeStatusFilter === 'all'
    ? statuses.map(s => ({
      ...s,
      tasks: filtered.filter(t => t.status === s.value),
    })).filter(s => s.tasks.length > 0)
    : [{ value: activeStatusFilter, label: statuses.find(s => s.value === activeStatusFilter)?.label || '', tasks: filtered }]

  const formatDueDateFull = (date?: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Tasks</h1>
            <span className="text-[10px] text-base-600 font-mono">({tasks.length})</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setForm({ ...emptyForm }); setShowCreate(true) }}>
            <Plus className="size-3.5" /> New Task
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Filter className="size-3 text-base-600" />
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono transition-colors ${
                !statusFilter ? 'bg-accent-muted text-accent' : 'text-base-500 hover:text-base-300 hover:bg-base-800'
              }`}
            >
              All
            </button>
            {statuses.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
                className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono transition-colors ${
                  statusFilter === s.value ? 'bg-accent-muted text-accent' : 'text-base-500 hover:text-base-300 hover:bg-base-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-6 rounded-[2px] border border-base-800 bg-base-950 px-1.5 text-[10px] font-mono text-base-400 outline-none"
          >
            <option value="">All Priorities</option>
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="size-5 animate-spin text-base-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckCircle2 className="size-10 text-base-700 mb-3" />
            <p className="text-[12px] text-base-500 font-mono mb-1">No tasks yet</p>
            <p className="text-[11px] text-base-600 font-mono mb-3">Create your first task to get started</p>
            <Button variant="secondary" size="sm" onClick={() => { setForm({ ...emptyForm }); setShowCreate(true) }}>
              <Plus className="size-3.5" /> New Task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(section => (
              <div key={section.value}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium text-base-500 uppercase tracking-wider font-mono">
                    {section.label}
                  </span>
                  <span className="text-[9px] text-base-600 font-mono">({section.tasks.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {section.tasks.map(t => (
                    <TaskCard key={t.id} task={t} onClick={() => { setSelectedTask(t); setEditMode(false) }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!createMutation.isPending) setShowCreate(false) }}>
            <div ref={formRef} className="w-[440px] rounded-[6px] border border-base-800 bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between h-10 px-3 border-b border-base-800">
                <span className="text-[11px] font-medium text-base-100 font-mono">New Task</span>
                <button type="button" onClick={() => setShowCreate(false)} className="size-5 flex items-center justify-center text-base-500 hover:text-base-200">
                  <Plus className="size-3.5 rotate-45" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title"
                  className="h-8 text-[12px] font-mono"
                  autoFocus
                />
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full h-20 rounded-[2px] border border-base-800 bg-base-950 px-2 py-1.5 text-[11px] font-mono text-base-200 outline-none focus:border-accent/40 resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-base-500 font-mono block mb-1">Priority</span>
                    <select
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                      className="w-full h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
                    >
                      {priorities.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-base-500 font-mono block mb-1">Status</span>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value as Task['status'] })}
                      className="w-full h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
                    >
                      {statuses.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-base-500 font-mono block mb-1">Due Date</span>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="h-7 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-base-500 font-mono block mb-1">Tags (comma separated)</span>
                  <Input
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="bug, feature, urgent"
                    className="h-7 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-base-500 font-mono block mb-1">Project (optional)</span>
                  <select
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                    className="w-full h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
                  >
                    <option value="">None</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-3 pb-3">
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  loading={createMutation.isPending}
                >
                  Create Task
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => { setSelectedTask(null); setEditMode(false) }}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-[500px] h-full bg-surface border-l border-base-800 shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-surface z-10">
                <div className="flex items-center justify-between h-10 px-3 border-b border-base-800">
                  <span className="text-[11px] font-medium text-base-100 font-mono">Task Details</span>
                  <button type="button" onClick={() => { setSelectedTask(null); setEditMode(false) }} className="size-5 flex items-center justify-center text-base-500 hover:text-base-200">
                    <Plus className="size-3.5 rotate-45" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {editMode ? (
                  <div className="space-y-2">
                    <Input
                      value={selectedTask.title}
                      onChange={e => setSelectedTask({ ...selectedTask, title: e.target.value })}
                      placeholder="Title"
                      className="h-8 text-[12px] font-mono"
                    />
                    <textarea
                      value={selectedTask.description}
                      onChange={e => setSelectedTask({ ...selectedTask, description: e.target.value })}
                      placeholder="Description"
                      className="w-full h-24 rounded-[2px] border border-base-800 bg-base-950 px-2 py-1.5 text-[11px] font-mono text-base-200 outline-none focus:border-accent/40 resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-base-500 font-mono block mb-1">Priority</span>
                        <select
                          value={selectedTask.priority}
                          onChange={e => setSelectedTask({ ...selectedTask, priority: e.target.value as Task['priority'] })}
                          className="w-full h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
                        >
                          {priorities.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-base-500 font-mono block mb-1">Status</span>
                        <select
                          value={selectedTask.status}
                          onChange={e => setSelectedTask({ ...selectedTask, status: e.target.value as Task['status'] })}
                          className="w-full h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
                        >
                          {statuses.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-base-500 font-mono block mb-1">Due Date</span>
                      <Input
                        type="date"
                        value={selectedTask.dueDate?.split('T')[0] || ''}
                        onChange={e => setSelectedTask({ ...selectedTask, dueDate: e.target.value || null })}
                        className="h-7 text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-base-500 font-mono block mb-1">Tags (comma separated)</span>
                      <Input
                        value={selectedTask.tags.join(', ')}
                        onChange={e => setSelectedTask({ ...selectedTask, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                        className="h-7 text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-base-500 font-mono block mb-1">Project (optional)</span>
                      <select
                        value={selectedTask.projectId || ''}
                        onChange={e => setSelectedTask({ ...selectedTask, projectId: e.target.value || null })}
                        className="w-full h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
                      >
                        <option value="">None</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleUpdate}
                        disabled={!selectedTask.title.trim()}
                        loading={updateMutation.isPending}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-[14px] font-medium text-base-100 font-mono mb-1">{selectedTask.title}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono ${priorityColors[selectedTask.priority]}`}>
                          <Flag className="size-2.5 mr-1" />
                          {priorities.find(p => p.value === selectedTask.priority)?.label}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono ${statusColors[selectedTask.status]}`}>
                          {statuses.find(s => s.value === selectedTask.status)?.label}
                        </span>
                        {selectedTask.dueDate && (
                          <span className="text-[9px] font-mono text-base-500">{formatDueDateFull(selectedTask.dueDate)}</span>
                        )}
                        {selectedTask.projectId && (
                          <span className="text-[9px] font-mono text-base-500">• {projects.find(p => p.id === selectedTask.projectId)?.name || 'Project'}</span>
                        )}
                      </div>
                    </div>

                    {selectedTask.description && (
                      <div>
                        <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider block mb-1">Description</span>
                        <p className="text-[11px] text-base-300 font-mono leading-relaxed">{selectedTask.description}</p>
                      </div>
                    )}

                    {selectedTask.tags.length > 0 && (
                      <div>
                        <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider block mb-1">Tags</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {selectedTask.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono bg-base-800 text-base-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider block mb-1">Change Status</span>
                      <div className="flex items-center gap-1.5">
                        {statuses.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => handleStatusChange(selectedTask, s.value)}
                            disabled={selectedTask.status === s.value}
                            className={`px-2 py-1 rounded-[2px] text-[10px] font-mono transition-colors ${
                              selectedTask.status === s.value
                                ? `${statusColors[s.value]} cursor-default`
                                : 'text-base-500 hover:text-base-300 hover:bg-base-800'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-base-800 pt-3 space-y-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditMode(true)}
                        className="w-full justify-center"
                      >
                        Edit Task
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(selectedTask.id)}
                        className="w-full justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="size-3.5" /> Delete Task
                      </Button>
                    </div>
                  </>
                )}

                <div className="border-t border-base-800 pt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-base-600">Created</span>
                    <span className="text-base-400">{formatRelativeTime(selectedTask.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-base-600">Updated</span>
                    <span className="text-base-400">{formatRelativeTime(selectedTask.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-base-600">ID</span>
                    <span className="text-base-500 font-mono text-[9px]">{selectedTask.id.slice(0, 12)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget) }}
          title="Delete Task"
          message="This will permanently delete this task."
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          icon={<AlertTriangle className="size-5 text-red-400" />}
        />
      </div>
    </div>
  )
}
