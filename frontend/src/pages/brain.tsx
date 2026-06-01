import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { brainService } from '@/services/brain.service'
import { MemoryCard } from '@/components/brain/memory-card'
import { MemoryDetailPanel } from '@/components/brain/memory-detail-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import type { Memory } from '@/types/api'
import {
  Brain, Search, Plus, Pin, PinOff, Loader2, AlertTriangle,
  Sparkles, Target, BookOpen, Trophy, Wrench, Heart, Settings,
  Sliders, RotateCcw, Trash2, ChevronDown, Check, Terminal,
  Clock, Activity, Star,
} from 'lucide-react'

type Section = 'dashboard' | 'memories' | 'projects' | 'goals' | 'skills' | 'preferences' | 'settings'

const sections: { id: Section; label: string; icon: typeof Brain }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'projects', label: 'Projects', icon: BookOpen },
  { id: 'goals', label: 'Goals', icon: Trophy },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'preferences', label: 'Preferences', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Sliders },
]

const categories = ['Identity', 'Preferences', 'Projects', 'Goals', 'Skills', 'Work', 'Personal'] as const

const categoryIcons: Record<string, typeof Sparkles> = {
  Identity: Sparkles,
  Preferences: Target,
  Projects: BookOpen,
  Goals: Trophy,
  Skills: Wrench,
  Work: BookOpen,
  Personal: Heart,
}

export function BrainPage() {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<string>('Personal')
  const [newImportance, setNewImportance] = useState(1)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const addingRef = useRef<HTMLDivElement>(null)

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['brain-dashboard'],
    queryFn: async () => (await brainService.getDashboard()).data,
  })

  const { data: memories = [], isLoading: memLoading } = useQuery({
    queryKey: ['brain-memories', search, categoryFilter, sortBy],
    queryFn: async () => {
      const res = await brainService.getMemories({
        search: search || undefined,
        category: categoryFilter || undefined,
        sort: sortBy as 'newest' | 'oldest' | 'importance',
      })
      return res.data || []
    },
  })

  const { data: settings } = useQuery({
    queryKey: ['brain-settings'],
    queryFn: async () => (await brainService.getSettings()).data,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['brain-memories'] })
    queryClient.invalidateQueries({ queryKey: ['brain-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['brain-settings'] })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string; category: string; importance: number }) =>
      brainService.createMemory(data),
    onSuccess: () => { invalidate(); setShowAddMemory(false); setNewTitle(''); setNewContent('') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Memory> }) => brainService.updateMemory(id, data),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => brainService.deleteMemory(id),
    onSuccess: () => { invalidate(); setSelectedMemory(null) },
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => brainService.deleteAllMemories(),
    onSuccess: () => { invalidate(); setShowDeleteAll(false) },
  })

  const handleTogglePin = async (memory: Memory) => {
    await updateMutation.mutateAsync({ id: memory.id, data: { pinned: !memory.pinned } })
    if (selectedMemory?.id === memory.id) {
      setSelectedMemory({ ...memory, pinned: !memory.pinned })
    }
  }

  const handleUpdateMemory = async (id: string, data: Partial<Memory>) => {
    const res = await updateMutation.mutateAsync({ id, data })
    if (res.data) setSelectedMemory(res.data)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addingRef.current && !addingRef.current.contains(e.target as Node)) setShowCategoryDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredByCategory = categoryFilter
    ? memories.filter(m => m.category === categoryFilter)
    : memories

  const pinnedMemories = filteredByCategory.filter(m => m.pinned)
  const unpinnedMemories = filteredByCategory.filter(m => !m.pinned)
  const sortedMemories = [...pinnedMemories, ...unpinnedMemories]

  const sectionNav = (
    <nav className="w-48 border-r border-base-800 bg-surface flex flex-col shrink-0">
      <div className="h-[37px] border-b border-base-800 flex items-center px-3">
        <Brain className="size-4 text-accent mr-2" />
        <span className="text-[11px] font-medium text-base-100 font-mono">Brain</span>
      </div>
      <div className="flex-1 py-1 overflow-y-auto">
        {sections.map(s => {
          const active = activeSection === s.id
          return (
            <button type="button"
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2.5 w-full px-3 h-8 text-xs transition-colors ${
                active ? 'text-base-100 bg-accent-muted' : 'text-base-400 hover:text-base-200 hover:bg-base-800/50'
              }`}
            >
              <s.icon className="size-4 shrink-0" />
              <span className="text-[11px] tracking-wide truncate">{s.label}</span>
              {active && <span className="ml-auto w-0.5 h-4 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>
    </nav>
  )

  const renderDashboard = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Terminal className="size-4 text-base-500" />
        <h1 className="text-sm font-medium text-base-100 font-mono">Brain Dashboard</h1>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Memories', value: dashboard?.totalMemories || 0, icon: Brain, color: 'text-accent' },
          { label: 'Pinned', value: dashboard?.pinnedMemories || 0, icon: Pin, color: 'text-accent' },
          { label: 'Projects', value: (dashboard?.categories?.Projects || 0), icon: BookOpen, color: 'text-emerald-400' },
          { label: 'Goals', value: (dashboard?.categories?.Goals || 0), icon: Trophy, color: 'text-amber-400' },
          { label: 'Skills', value: (dashboard?.categories?.Skills || 0), icon: Wrench, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="rounded-[4px] border border-base-800 bg-surface p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className={`size-3.5 ${s.color}`} />
              <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-lg font-semibold text-base-100 font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-base-400 font-mono">
        <span className={`inline-block size-2 rounded-full ${dashboard?.memoryEnabled ? 'bg-emerald-500' : 'bg-base-600'}`} />
        Memory {dashboard?.memoryEnabled ? 'Enabled' : 'Disabled'}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="size-3.5 text-base-500" />
          <h2 className="text-[10px] font-medium text-base-500 uppercase tracking-wider font-mono">Recent Activity</h2>
        </div>
        {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
          <div className="rounded-[4px] border border-base-800 bg-surface divide-y divide-base-800">
            {dashboard.recentActivity.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5">
                <div className="size-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-[11px] text-base-400 font-mono truncate">{a.title}</span>
                <span className="text-[9px] text-base-600 font-mono shrink-0 ml-auto">
                  {new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-base-600 font-mono">No activity yet. Start adding memories!</p>
        )}
      </div>
    </div>
  )

  const renderMemories = () => (
    <div className="flex flex-col h-full">
      <div className="shrink-0 p-3 border-b border-base-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Memories</h1>
            <span className="text-[10px] text-base-600 font-mono">({memories.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-base-600" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search memories..."
                className="pl-7 h-7 w-48 text-[11px] font-mono"
              />
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddMemory(true)}>
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {categories.map(c => (
              <button type="button"
                key={c}
                onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
                className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono transition-colors ${
                  categoryFilter === c ? 'bg-accent-muted text-accent' : 'text-base-500 hover:text-base-300 hover:bg-base-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-6 rounded-[2px] border border-base-800 bg-base-950 px-1.5 text-[10px] font-mono text-base-400 outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="importance">Importance</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-2">
          {memLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-4 animate-spin text-base-500" />
            </div>
          ) : sortedMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Brain className="size-8 text-base-700 mb-2" />
              <p className="text-[11px] text-base-600 font-mono">No memories found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedMemories.map(m => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  active={selectedMemory?.id === m.id}
                  onSelect={() => setSelectedMemory(m)}
                  onTogglePin={() => handleTogglePin(m)}
                />
              ))}
            </div>
          )}
        </div>
        <MemoryDetailPanel
          memory={selectedMemory}
          onUpdate={handleUpdateMemory}
          onDelete={(id) => setDeleteTarget(id)}
          onClose={() => setSelectedMemory(null)}
        />
      </div>
    </div>
  )

  const renderProjects = () => {
    const projectMemories = memories.filter(m => m.category === 'Projects')
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Projects</h1>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setNewCategory('Projects'); setShowAddMemory(true) }}>
            <Plus className="size-3.5" /> Add Project
          </Button>
        </div>
        {projectMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="size-8 text-base-700 mb-2" />
            <p className="text-[11px] text-base-600 font-mono">No projects saved</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {projectMemories.map(m => (
              <div key={m.id} className="rounded-[4px] border border-base-800 bg-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[12px] font-medium text-base-100 font-mono">{m.title}</h3>
                  <button type="button" onClick={() => handleTogglePin(m)} className="text-base-500 hover:text-accent">
                    {m.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                  </button>
                </div>
                <p className="text-[11px] text-base-500 font-mono leading-relaxed">{m.content}</p>
                <div className="flex items-center gap-2 mt-2 text-[9px] text-base-600 font-mono">
                  <span>{new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><Star className="size-3" />{m.importance}/5</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderGoals = () => {
    const goalMemories = memories.filter(m => m.category === 'Goals')
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Goals</h1>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setNewCategory('Goals'); setShowAddMemory(true) }}>
            <Plus className="size-3.5" /> Add Goal
          </Button>
        </div>
        {goalMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Trophy className="size-8 text-base-700 mb-2" />
            <p className="text-[11px] text-base-600 font-mono">No goals saved</p>
          </div>
        ) : (
          <div className="space-y-1">
            {goalMemories.map(m => (
              <div key={m.id} className="flex items-start gap-3 rounded-[4px] border border-base-800 bg-surface p-2.5">
                <div className="size-2 rounded-full bg-accent mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-base-100 font-mono">{m.title}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-base-600 font-mono">Imp {m.importance}/5</span>
                      <button type="button" onClick={() => handleTogglePin(m)} className="text-base-500 hover:text-accent">
                        {m.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                      </button>
                    </div>
                  </div>
                  {m.content && <p className="text-[11px] text-base-500 font-mono mt-0.5">{m.content}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSkills = () => {
    const skillMemories = memories.filter(m => m.category === 'Skills')
    const byCategory: Record<string, Memory[]> = {}
    skillMemories.forEach(m => {
      const cat = m.source || 'General'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(m)
    })

    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Skills</h1>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setNewCategory('Skills'); setShowAddMemory(true) }}>
            <Plus className="size-3.5" /> Add Skill
          </Button>
        </div>
        {skillMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Wrench className="size-8 text-base-700 mb-2" />
            <p className="text-[11px] text-base-600 font-mono">No skills saved</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(byCategory).map(([cat, skills]) => (
              <div key={cat} className="rounded-[4px] border border-base-800 bg-surface p-3">
                <h3 className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono mb-2">{cat}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(m => (
                    <div key={m.id} className="group relative flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[11px] font-mono bg-base-800/50 border border-base-700 text-base-300">
                      {m.title}
                      <span className={`size-1.5 rounded-full ml-1 ${
                        m.importance >= 4 ? 'bg-emerald-500' : m.importance >= 2 ? 'bg-amber-500' : 'bg-base-500'
                      }`} />
                      <button type="button"
                        onClick={() => deleteMutation.mutate(m.id)}
                        className="ml-1 opacity-0 group-hover:opacity-100 text-base-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderPreferences = () => {
    const prefMemories = memories.filter(m => m.category === 'Preferences')
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Preferences</h1>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setNewCategory('Preferences'); setShowAddMemory(true) }}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
        {prefMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Heart className="size-8 text-base-700 mb-2" />
            <p className="text-[11px] text-base-600 font-mono">No preferences saved</p>
          </div>
        ) : (
          <div className="space-y-1">
            {prefMemories.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-[4px] border border-base-800 bg-surface p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Target className="size-3.5 text-base-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-base-200 font-mono">{m.title}</span>
                    <span className="text-[11px] text-base-500 font-mono ml-2">{m.content}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] text-base-600 font-mono">{Math.round(m.confidence * 100)}%</span>
                  <button type="button" onClick={() => handleTogglePin(m)} className="text-base-500 hover:text-accent">
                    {m.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSettings = () => (
    <div className="p-4 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Sliders className="size-4 text-base-500" />
        <h1 className="text-sm font-medium text-base-100 font-mono">Brain Settings</h1>
      </div>

      <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-base-800 bg-surface-alt">
          <h2 className="text-[11px] font-medium text-base-200 font-mono">Memory Controls</h2>
        </div>
        <div className="p-4 space-y-3">
          {[
            { key: 'memoryEnabled', label: 'Enable Memory', desc: 'Allow the AI to remember information about you across conversations' },
            { key: 'autoExtract', label: 'Auto Memory Extraction', desc: 'Automatically extract and save important information from conversations' },
            { key: 'allowUpdates', label: 'Allow Memory Updates', desc: 'Allow existing memories to be updated with new information' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-base-200 font-mono">{item.label}</div>
                <div className="text-[10px] text-base-500 font-mono">{item.desc}</div>
              </div>
              <button type="button"
                onClick={() => {
                  const key = item.key as keyof typeof settings
                  brainService.updateSettings({ [key]: !settings?.[key] }).then(() => invalidate())
                }}
                className={`h-5 w-9 rounded-full transition-colors ${
                  settings?.[item.key as keyof typeof settings] ? 'bg-accent' : 'bg-base-700'
                }`}
              >
                <div className={`size-4 rounded-full bg-white transition-transform ${
                  settings?.[item.key as keyof typeof settings] ? 'translate-x-[18px]' : 'translate-x-[2px]'
                }`} />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-[11px] font-medium text-base-200 font-mono">Retention Period</div>
              <div className="text-[10px] text-base-500 font-mono">How long to keep memories</div>
            </div>
            <select
              value={settings?.retentionDays || 365}
              onChange={e => brainService.updateSettings({ retentionDays: parseInt(e.target.value) }).then(() => invalidate())}
              className="h-7 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-base-200 outline-none"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={3650}>Forever</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[4px] border border-red-500/20 bg-red-500/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-red-500/20">
          <h2 className="text-[11px] font-medium text-red-400 font-mono">Danger Zone</h2>
        </div>
        <div className="p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => setShowDeleteAll(true)}
          >
            <Trash2 className="size-3.5" /> Delete All Memories
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => {
              brainService.updateSettings({ memoryEnabled: false, autoExtract: false }).then(() => invalidate())
            }}
          >
            <RotateCcw className="size-3.5" /> Reset Brain
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      {sectionNav}

      <div className="flex-1 flex flex-col min-w-0">
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'memories' && renderMemories()}
        {activeSection === 'projects' && renderProjects()}
        {activeSection === 'goals' && renderGoals()}
        {activeSection === 'skills' && renderSkills()}
        {activeSection === 'preferences' && renderPreferences()}
        {activeSection === 'settings' && renderSettings()}
      </div>

      {showAddMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddMemory(false)}>
          <div ref={addingRef} className="w-[420px] rounded-[6px] border border-base-800 bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between h-10 px-3 border-b border-base-800">
              <span className="text-[11px] font-medium text-base-100 font-mono">New Memory</span>
              <button type="button" onClick={() => setShowAddMemory(false)} className="size-5 flex items-center justify-center text-base-500 hover:text-base-200">
                <Plus className="size-3.5 rotate-45" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Title"
                className="h-8 text-[12px] font-mono"
                autoFocus
              />
              <div className="relative">
                <button type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full h-8 rounded-[2px] border border-base-800 bg-base-950 px-2 text-[11px] font-mono text-left text-base-200 flex items-center justify-between"
                >
                  {newCategory}
                  <ChevronDown className="size-3 text-base-500" />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 rounded-[4px] border border-base-800 bg-surface shadow-lg z-10 overflow-hidden">
                    {categories.map(c => (
                      <button type="button" key={c} onClick={() => { setNewCategory(c); setShowCategoryDropdown(false) }}
                        className={`w-full text-left px-2.5 py-1.5 text-[11px] font-mono transition-colors ${
                          newCategory === c ? 'bg-accent-muted text-accent' : 'text-base-400 hover:bg-base-800 hover:text-base-200'
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="What do you want the AI to remember?"
                className="w-full h-20 rounded-[2px] border border-base-800 bg-base-950 px-2 py-1.5 text-[11px] font-mono text-base-200 outline-none focus:border-accent/40 resize-none"
              />
              <div>
                <span className="text-[10px] text-base-500 font-mono block mb-1">Importance</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button type="button" key={n} onClick={() => setNewImportance(n)}
                      className={`h-6 w-8 rounded-[2px] text-[10px] font-mono transition-colors ${
                        n <= newImportance ? 'bg-accent text-neutral-950' : 'bg-base-800 text-base-500 hover:bg-base-700'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-3 pb-3">
              <Button variant="ghost" size="sm" onClick={() => setShowAddMemory(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => createMutation.mutate({ title: newTitle, content: newContent, category: newCategory, importance: newImportance })}
                disabled={!newTitle.trim() || !newContent.trim()}
                loading={createMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget); setDeleteTarget(null) } }}
        title="Delete Memory"
        message="This will permanently delete this memory."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        icon={<AlertTriangle className="size-5 text-red-400" />}
      />

      <Dialog
        open={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={() => deleteAllMutation.mutate()}
        title="Delete All Memories"
        message="This will permanently delete all memories. This action cannot be undone."
        confirmLabel="Delete All"
        isLoading={deleteAllMutation.isPending}
        icon={<AlertTriangle className="size-5 text-red-400" />}
      />
    </div>
  )
}
