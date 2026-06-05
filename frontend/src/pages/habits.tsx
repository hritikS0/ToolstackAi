import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { habitsService } from '@/services/habits.service'
import { projectsService } from '@/services/projects.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import {
  Flame, CheckCircle2, Plus, Trash2, Loader2, Sparkles, Terminal, ListTodo, X,
  Trophy, Activity, TrendingUp, AlertTriangle
} from 'lucide-react'
import type { Habit, HabitStats } from '@/types/api'
import ReactMarkdown from 'react-markdown'
import { Dialog } from '@/components/ui/dialog'

const FREQ_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

const FREQ_COLORS: Record<string, string> = {
  daily: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  weekly: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  monthly: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function generateHeatmapGrid(heatmapData: { date: string; completed: boolean }[]) {
  const map = new Map(heatmapData.map(h => [h.date, h.completed]))
  const now = new Date()
  const currentSunday = new Date(now)
  currentSunday.setDate(now.getDate() - now.getDay())
  const oldestSunday = new Date(currentSunday)
  oldestSunday.setDate(currentSunday.getDate() - 21)

  const cells: { date: string; completed: boolean; future: boolean }[][] = []
  for (let row = 0; row < 7; row++) {
    cells.push([])
    for (let col = 0; col < 4; col++) {
      const d = new Date(oldestSunday)
      d.setDate(oldestSunday.getDate() + row + col * 7)
      const dateStr = d.toISOString().split('T')[0]
      const todayStr = now.toISOString().split('T')[0]
      cells[row].push({
        date: dateStr,
        completed: map.get(dateStr) ?? false,
        future: dateStr > todayStr,
      })
    }
  }
  return { cells, oldestSunday, currentSunday }
}

function Heatmap({ heatmapData }: { heatmapData: { date: string; completed: boolean }[] }) {
  const { cells } = useMemo(() => generateHeatmapGrid(heatmapData), [heatmapData])

  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-0.5 shrink-0 pt-5">
        {DAY_LABELS.map((label, i) => (
          <span key={label} className={cn('text-[8px] text-base-600 font-mono leading-[12px]', i % 2 === 1 ? 'visible' : 'invisible')}>
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-0.5">
        {cells.flat().map((cell) => (
          <div
            key={cell.date}
            className={cn(
              'size-3 rounded-sm',
              cell.future
                ? 'bg-base-850 border border-base-800'
                : cell.completed
                  ? 'bg-emerald-500/70'
                  : 'bg-base-800',
            )}
            title={cell.future ? `${cell.date}: upcoming` : `${cell.date}: ${cell.completed ? 'Completed' : 'Not completed'}`}
          />
        ))}
      </div>
    </div>
  )
}

interface CellData {
  date: Date
  dateStr: string
  completedCount: number
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
  completionsList: string[]
}

function YearHeatmap({ 
  habits, 
  selectedHabitId,
  onCellClick
}: { 
  habits: Habit[]
  selectedHabitId: string | 'all'
  onCellClick?: (cell: CellData) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string
    completedCount: number
    completionsList: string[]
    level: number
    x: number
    y: number
  } | null>(null)

  const { columns, monthLabels } = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    
    // Start from 52 weeks ago
    const endDate = new Date(now)
    endDate.setHours(0, 0, 0, 0)
    
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 364)
    // Align to Sunday
    const startDay = startDate.getDay()
    startDate.setDate(startDate.getDate() - startDay)
    
    const cols: CellData[][] = []
    
    // Map completions
    const completionMap = new Map<string, { habitTitle: string; completed: boolean }[]>()
    
    habits.forEach(h => {
      if (selectedHabitId !== 'all' && h.id !== selectedHabitId) return
      
      const comps = h.completions || []
      comps.forEach(c => {
        const dateStr = new Date(c.periodStart).toISOString().split('T')[0]
        if (!completionMap.has(dateStr)) {
          completionMap.set(dateStr, [])
        }
        completionMap.get(dateStr)!.push({ habitTitle: h.title, completed: true })
      })
    })
    
    for (let col = 0; col < 53; col++) {
      const colCells = []
      for (let row = 0; row < 7; row++) {
        const d = new Date(startDate)
        d.setDate(startDate.getDate() + col * 7 + row)
        const dateStr = d.toISOString().split('T')[0]
        const future = dateStr > todayStr
        
        const doneList = completionMap.get(dateStr) || []
        const completedCount = doneList.length
        
        let level: 0 | 1 | 2 | 3 | 4 = 0
        if (completedCount > 0) {
          if (selectedHabitId === 'all') {
            const totalActive = habits.filter(h => h.active).length
            if (totalActive > 0 && completedCount === totalActive) {
              level = 4
            } else if (completedCount >= 3) {
              level = 3
            } else if (completedCount === 2) {
              level = 2
            } else {
              level = 1
            }
          } else {
            level = 4
          }
        }
        
        colCells.push({
          date: d,
          dateStr,
          completedCount,
          level,
          future,
          completionsList: doneList.map(item => item.habitTitle),
        })
      }
      cols.push(colCells)
    }
    
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const mLabels: { index: number; label: string }[] = []
    let prevMonth = -1
    cols.forEach((week, index) => {
      const m = week[0].date.getMonth()
      if (m !== prevMonth) {
        mLabels.push({ index, label: MONTHS[m] })
        prevMonth = m
      }
    })
    
    return { columns: cols, monthLabels: mLabels }
  }, [habits, selectedHabitId])

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div ref={containerRef} className="relative rounded-[4px] border border-base-800 bg-surface-alt p-4">
      {/* Scrollable Container */}
      <div className="overflow-x-auto no-scrollbar w-full relative">
        <div className="min-w-[730px] pt-5">
          {/* Months label row */}
          <div className="absolute top-1 left-0 flex gap-[3px] select-none text-[9px] text-base-500 font-mono h-4">
            {monthLabels.map((ml, idx) => (
              <span
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${ml.index * 13 + 30}px`,
                }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] pr-2.5 justify-between py-0.5 text-[9px] text-base-600 font-mono select-none w-[22px] shrink-0">
              {DAYS.map((day, i) => (
                <span key={day} className={cn(i % 2 === 1 ? 'visible' : 'invisible')}>
                  {day.slice(0, 3)}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]">
              {columns.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((cell) => (
                    <div
                      key={cell.dateStr}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const containerRect = containerRef.current?.getBoundingClientRect()
                        if (containerRect) {
                          setHoveredCell({
                            dateStr: cell.dateStr,
                            completedCount: cell.completedCount,
                            completionsList: cell.completionsList,
                            level: cell.level,
                            x: rect.left - containerRect.left + 5,
                            y: rect.top - containerRect.top - 46,
                          })
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onCellClick?.(cell)}
                      className={cn(
                        "size-[10px] rounded-[1px] transition-all duration-150 cursor-pointer shrink-0",
                        cell.future
                          ? "bg-base-950 border border-base-900/35 pointer-events-none opacity-40"
                          : cell.level === 0
                            ? "bg-base-800 hover:bg-base-750"
                            : cell.level === 1
                              ? "bg-accent/20 hover:bg-accent/30 border border-accent/10"
                              : cell.level === 2
                                ? "bg-accent/40 hover:bg-accent/50 border border-accent/20"
                                : cell.level === 3
                                  ? "bg-accent/70 hover:bg-accent/80"
                                  : "bg-accent hover:bg-accent-hover shadow-[0_0_8px_rgba(245,158,11,0.45)]"
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip (Absolute relative to parent container) */}
      {hoveredCell && (
        <div
          className="absolute z-20 pointer-events-none rounded-[4px] border border-base-700 bg-base-950 px-2.5 py-1.5 shadow-xl text-left font-mono animate-fade-in"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-[10px] font-semibold text-base-300 mb-0.5">
            {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(hoveredCell.dateStr + 'T00:00:00'))}
          </p>
          {selectedHabitId === 'all' ? (
            <>
              <p className="text-[10px] text-accent font-medium">
                {hoveredCell.completedCount} completed
              </p>
              {hoveredCell.completionsList.length > 0 && (
                <p className="text-[9px] text-base-500 max-w-[150px] truncate leading-tight mt-1">
                  {hoveredCell.completionsList.join(', ')}
                </p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-accent font-medium">
              {hoveredCell.completedCount > 0 ? 'Completed' : 'Missed'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
function ModalOverlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface border border-base-800 rounded-[4px] w-full max-w-md shadow-lg">
        {children}
      </div>
    </div>
  )
}

function CreateHabitDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [targetCount, setTargetCount] = useState('')
  const [projectId, setProjectId] = useState('')

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectsService.list()).data || [],
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; frequency: 'daily' | 'weekly' | 'monthly'; targetCount?: string; projectId?: string }) =>
      habitsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      onClose()
      setTitle('')
      setDescription('')
      setFrequency('daily')
      setTargetCount('')
      setProjectId('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      targetCount: targetCount.trim() || undefined,
      projectId: projectId.trim() || undefined,
    })
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-800">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-base-400" />
            <span className="text-[12px] font-medium text-base-200 font-mono">New Habit</span>
          </div>
          <button type="button" onClick={onClose} className="size-6 flex items-center justify-center text-base-500 hover:text-base-300">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning workout"
              className="h-8 text-[12px]"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="min-h-[60px] text-[12px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Frequency</label>
              <Select
                value={frequency}
                onChange={val => setFrequency(val as 'daily' | 'weekly' | 'monthly')}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                buttonClassName="h-8 py-0 px-2.5 text-[12px] bg-surface"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Target (optional)</label>
              <Input
                value={targetCount}
                onChange={e => setTargetCount(e.target.value)}
                placeholder="e.g. 5"
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">Project (optional)</label>
            <Select
              value={projectId}
              onChange={val => setProjectId(val)}
              options={[{ value: '', label: 'None' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
              buttonClassName="h-8 py-0 px-2.5 text-[12px] bg-surface"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!title.trim() || createMutation.isPending} loading={createMutation.isPending}>
            Create Habit
          </Button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function AICreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const aiCreateMutation = useMutation({
    mutationFn: (msg: string) => habitsService.aiCreate(msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      onClose()
      setMessage('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    aiCreateMutation.mutate(message.trim())
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-800">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-base-400" />
            <span className="text-[12px] font-medium text-base-200 font-mono">AI Create Habits</span>
          </div>
          <button type="button" onClick={onClose} className="size-6 flex items-center justify-center text-base-500 hover:text-base-300">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-medium text-base-400 mb-1 block font-mono uppercase tracking-wider">
              Describe your habits in natural language
            </label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I want to work out 3 times a week, read every day for 30 minutes, and meditate every morning..."
              className="min-h-[80px] text-[12px]"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  if (message.trim()) aiCreateMutation.mutate(message.trim())
                }
              }}
            />
            <p className="text-[10px] text-base-600 font-mono mt-1.5">
              Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={aiCreateMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!message.trim() || aiCreateMutation.isPending}
            loading={aiCreateMutation.isPending}
          >
            <Sparkles className="size-3" /> Generate
          </Button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function HabitCard({
  habit,
  isExpanded,
  onToggleExpand,
  stats,
  statsLoading,
  onComplete,
  onDelete,
  completePending,
  deletePending,
}: {
  habit: Habit
  isExpanded: boolean
  onToggleExpand: () => void
  stats: HabitStats | undefined
  statsLoading: boolean
  onComplete: () => void
  onDelete: () => void
  completePending: boolean
  deletePending: boolean
}) {
  const freq = habit.frequency
  const streak = habit.currentStreak ?? 0
  const todayDone = habit.todayCompleted ?? false

  return (
    <div
      className={cn(
        'rounded-[4px] border border-base-800 bg-surface transition-colors',
        isExpanded && 'border-accent/30',
      )}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-[14px] font-medium text-base-100 font-mono truncate">{habit.title}</h3>
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono border shrink-0', FREQ_COLORS[freq])}>
              {FREQ_LABELS[freq]}
            </span>
          </div>
          {habit.description && (
            <p className="text-[12px] text-base-500 font-mono line-clamp-2 mb-2">{habit.description}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[12px] text-base-400 font-mono">
              <Flame className="size-3.5 text-amber-400" />
              <span className="tabular-nums">{streak}</span>
              <span className="text-base-600">{streak === 1 ? 'day' : 'days'}</span>
            </span>
            {habit.longestStreak != null && habit.longestStreak > 0 && (
              <span className="text-[11px] text-base-600 font-mono">
                best: <span className="text-base-500 tabular-nums">{habit.longestStreak}</span>d
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onComplete}
          disabled={completePending}
          className={cn(
            'size-10 rounded-[4px] flex items-center justify-center shrink-0 transition-all border',
            todayDone
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
              : 'border-base-700 text-base-600 hover:border-base-600 hover:text-base-400',
            completePending && 'opacity-50 pointer-events-none',
          )}
          title={todayDone ? 'Undo completion' : 'Mark today as complete'}
        >
          {completePending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <CheckCircle2 className={cn('size-5', todayDone && 'fill-emerald-400 text-surface')} />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-base-800 pt-3 space-y-3">
          {statsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-base-500" />
            </div>
          ) : stats ? (
            <>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Completion</span>
                  <p className="text-[14px] font-semibold text-base-100 font-mono tabular-nums">{stats.completionRate}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Longest Streak</span>
                  <p className="text-[14px] font-semibold text-base-100 font-mono tabular-nums">{stats.longestStreak} days</p>
                </div>
                <div>
                  <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Current Streak</span>
                  <p className="text-[14px] font-semibold text-base-100 font-mono tabular-nums">{stats.currentStreak} days</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider block mb-1.5">Last 4 Weeks</span>
                <Heatmap heatmapData={stats.heatmap} />
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <span className="text-[11px] text-base-600 font-mono">No stats available</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deletePending}
              loading={deletePending}
            >
              <Trash2 className="size-3" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function HabitsPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const idParam = searchParams.get('id')

  const [showCreate, setShowCreate] = useState(false)
  const [showAiCreate, setShowAiCreate] = useState(false)
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedHabitId, setSelectedHabitId] = useState<string | 'all'>('all')
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitsService.list()).data || [],
  })

  useEffect(() => {
    if (idParam) {
      setSelectedHabitId(idParam)
      setExpandedId(idParam)
    }
  }, [idParam])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['habit-stats', expandedId],
    queryFn: async () => {
      if (!expandedId) return undefined
      return (await habitsService.getStats(expandedId)).data
    },
    enabled: !!expandedId,
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => habitsService.complete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] })
      const previous = queryClient.getQueryData<Habit[]>(['habits'])
      if (previous) {
        queryClient.setQueryData<Habit[]>(['habits'], previous.map(h => {
          if (h.id !== id) return h
          const wasDone = h.todayCompleted
          return {
            ...h,
            todayCompleted: !wasDone,
            currentStreak: wasDone ? Math.max(0, (h.currentStreak ?? 0) - 1) : (h.currentStreak ?? 0) + 1,
          }
        }))
      }
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['habits'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      if (expandedId) queryClient.invalidateQueries({ queryKey: ['habit-stats', expandedId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => habitsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      if (expandedId) setExpandedId(null)
      setDeleteTarget(null)
    },
  })

  const handleAiInsights = async () => {
    if (aiInsights) {
      setAiInsights(null)
      return
    }
    setInsightsLoading(true)
    try {
      const res = await habitsService.aiInsights()
      setAiInsights(res.data || null)
    } catch {
      setAiInsights('Failed to load AI insights. Please try again.')
    } finally {
      setInsightsLoading(false)
    }
  }

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const activeHabits = (habits as Habit[]).filter(h => h.active)
  const inactiveHabits = (habits as Habit[]).filter(h => !h.active)

  const calculateConsistencyScore = (streak: number, completionRate: number, last7DaysCompletions: number) => {
    const streakPoints = Math.min(30, streak)
    const ratePoints = Math.round(completionRate * 0.4)
    const weeklyPoints = Math.round((last7DaysCompletions / 7) * 30)
    return Math.min(100, Math.max(0, streakPoints + ratePoints + weeklyPoints))
  }

  const statsAllHabits = useMemo(() => {
    if (activeHabits.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        completionRate: 0,
        consistencyScore: 0,
        weeklyCompletions: 0,
      }
    }
    
    const completedDates = new Set<string>()
    activeHabits.forEach(h => {
      (h.completions || []).forEach(c => {
        const dStr = new Date(c.periodStart).toISOString().split('T')[0]
        completedDates.add(dStr)
      })
    })
    
    const sortedDates = Array.from(completedDates)
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime())
      
    let longestStreak = 0
    let tempStreak = 0
    let prevDate: Date | null = null
    
    sortedDates.forEach(date => {
      if (!prevDate) {
        tempStreak = 1
      } else {
        const diffTime = date.getTime() - prevDate.getTime()
        const diffDays = Math.round(diffTime / 86400000)
        if (diffDays === 1) {
          tempStreak++
        } else if (diffDays > 1) {
          tempStreak = 1
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak
      prevDate = date
    })
    
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    let currentStreak = 0
    if (completedDates.has(todayStr) || completedDates.has(yesterdayStr)) {
      let checkDate = completedDates.has(todayStr) ? now : yesterday
      currentStreak = 1
      while (true) {
        const check = new Date(checkDate)
        check.setDate(check.getDate() - 1)
        const checkStr = check.toISOString().split('T')[0]
        if (completedDates.has(checkStr)) {
          currentStreak++
          checkDate = check
        } else {
          break
        }
      }
    }
    
    let sumRate = 0
    activeHabits.forEach(h => {
      const comps = h.completions || []
      const uniqueComps = new Set(comps.map(c => new Date(c.periodStart).toISOString().split('T')[0]))
      const createdDate = new Date(h.createdAt)
      const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdDate.getTime()) / 86400000))
      const rate = Math.min(100, Math.round((uniqueComps.size / daysSinceCreation) * 100))
      sumRate += rate
    })
    const completionRate = Math.round(sumRate / activeHabits.length)
    
    let last7DaysCompletions = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dStr = d.toISOString().split('T')[0]
      if (completedDates.has(dStr)) {
        last7DaysCompletions++
      }
    }
    
    const consistencyScore = calculateConsistencyScore(currentStreak, completionRate, last7DaysCompletions)
    
    return {
      currentStreak,
      longestStreak,
      completionRate,
      consistencyScore,
      weeklyCompletions: last7DaysCompletions,
    }
  }, [activeHabits])

  const selectedHabitStats = useMemo(() => {
    if (selectedHabitId === 'all') return statsAllHabits
    const habit = activeHabits.find(h => h.id === selectedHabitId)
    if (!habit) return statsAllHabits
    
    const now = new Date()
    const comps = habit.completions || []
    const completedDates = new Set(comps.map(c => new Date(c.periodStart).toISOString().split('T')[0]))
    
    const sortedDates = Array.from(completedDates)
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime())
      
    let longestStreak = 0
    let tempStreak = 0
    let prevDate: Date | null = null
    
    sortedDates.forEach(date => {
      if (!prevDate) {
        tempStreak = 1
      } else {
        const diffTime = date.getTime() - prevDate.getTime()
        const diffDays = Math.round(diffTime / 86400000)
        if (diffDays === 1) {
          tempStreak++
        } else if (diffDays > 1) {
          tempStreak = 1
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak
      prevDate = date
    })
    
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    let currentStreak = 0
    if (completedDates.has(todayStr) || completedDates.has(yesterdayStr)) {
      let checkDate = completedDates.has(todayStr) ? now : yesterday
      currentStreak = 1
      while (true) {
        const check = new Date(checkDate)
        check.setDate(check.getDate() - 1)
        const checkStr = check.toISOString().split('T')[0]
        if (completedDates.has(checkStr)) {
          currentStreak++
          checkDate = check
        } else {
          break
        }
      }
    }
    
    const createdDate = new Date(habit.createdAt)
    const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdDate.getTime()) / 86400000))
    const completionRate = Math.min(100, Math.round((completedDates.size / daysSinceCreation) * 100))
    
    let last7DaysCompletions = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dStr = d.toISOString().split('T')[0]
      if (completedDates.has(dStr)) {
        last7DaysCompletions++
      }
    }
    
    const consistencyScore = calculateConsistencyScore(currentStreak, completionRate, last7DaysCompletions)
    
    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, habit.longestStreak ?? 0),
      completionRate,
      consistencyScore,
      weeklyCompletions: last7DaysCompletions,
    }
  }, [selectedHabitId, activeHabits, statsAllHabits])

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Habits</h1>
            <span className="text-[11px] text-base-600 font-mono">
              {activeHabits.length} active
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleAiInsights} loading={insightsLoading}>
              {insightsLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              AI Insights
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAiCreate(true)}>
              <Sparkles className="size-3.5" />
              AI Create
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="size-3.5" /> New Habit
            </Button>
          </div>
        </div>

        {aiInsights != null && (
          <div className="rounded-[4px] border border-accent/20 bg-accent-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <span className="text-[11px] font-medium text-accent font-mono uppercase tracking-wider">AI Insights</span>
              </div>
              <button
                type="button"
                onClick={() => setAiInsights(null)}
                className="size-5 flex items-center justify-center text-base-500 hover:text-base-300"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-[12px] font-mono leading-relaxed text-base-300 [&_h1]:text-[14px] [&_h2]:text-[13px] [&_h3]:text-[12px] [&_p]:text-[12px] [&_ul]:text-[12px] [&_ol]:text-[12px] [&_li]:text-[12px] [&_strong]:text-base-200">
              <ReactMarkdown>{aiInsights}</ReactMarkdown>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-base-500" />
          </div>
        ) : habits.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <ListTodo className="size-8 text-base-700 mx-auto mb-3" />
              <p className="text-[13px] text-base-500 font-mono mb-4">No habits tracked yet</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="size-3.5" /> Create your first habit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAiCreate(true)}>
                  <Sparkles className="size-3.5" /> AI Create
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Dashboard Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in">
              <div className="rounded-[4px] border border-base-800 bg-surface px-3 py-2.5 hover:border-base-750 transition-colors min-w-0">
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <Activity className="size-3.5 text-accent shrink-0" />
                  <span className="text-[11px] text-base-500 font-mono uppercase tracking-wider truncate">Consistency Score</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-base-100 font-mono tabular-nums">{selectedHabitStats.consistencyScore}</span>
                  <span className="text-[12px] text-base-500 font-mono">/100</span>
                </div>
              </div>
              
              <div className="rounded-[4px] border border-base-800 bg-surface px-3 py-2.5 hover:border-base-750 transition-colors min-w-0">
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <Flame className="size-3.5 text-orange-400 shrink-0" />
                  <span className="text-[11px] text-base-500 font-mono uppercase tracking-wider truncate">Current Streak</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-base-100 font-mono tabular-nums">{selectedHabitStats.currentStreak}</span>
                  <span className="text-[12px] text-base-500 font-mono">{selectedHabitStats.currentStreak === 1 ? 'day' : 'days'}</span>
                </div>
              </div>

              <div className="rounded-[4px] border border-base-800 bg-surface px-3 py-2.5 hover:border-base-750 transition-colors min-w-0">
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <Trophy className="size-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] text-base-500 font-mono uppercase tracking-wider truncate">Longest Streak</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-base-100 font-mono tabular-nums">{selectedHabitStats.longestStreak}</span>
                  <span className="text-[12px] text-base-500 font-mono">{selectedHabitStats.longestStreak === 1 ? 'day' : 'days'}</span>
                </div>
              </div>

              <div className="rounded-[4px] border border-base-800 bg-surface px-3 py-2.5 hover:border-base-750 transition-colors min-w-0">
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <TrendingUp className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-base-500 font-mono uppercase tracking-wider truncate">Completion Rate</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-base-100 font-mono tabular-nums">{selectedHabitStats.completionRate}%</span>
                </div>
              </div>
            </div>

            {/* Interactive Heatmap Widget */}
            <div className="rounded-[4px] border border-base-800 bg-surface p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-base-200 font-mono uppercase tracking-wider">
                    {selectedHabitId === 'all' ? 'All Habits Heatmap' : 'Habit Performance'}
                  </h3>
                  <p className="text-[11px] text-base-500 font-mono">
                    Showing 365-day consistency visualization
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-base-500 font-mono">Habit:</span>
                  <Select
                    value={selectedHabitId}
                    onChange={val => {
                      setSelectedHabitId(val)
                      setSelectedCell(null)
                    }}
                    options={[
                      { value: 'all', label: 'All Habits Overview' },
                      ...activeHabits.map(h => ({ value: h.id, label: `${h.title} (🔥 ${h.currentStreak || 0}d)` })),
                    ]}
                    className="w-48 shrink-0"
                    buttonClassName="h-8 py-0 px-2.5 text-[12px] bg-surface"
                    popoverClassName="w-48 right-0 left-auto"
                  />
                </div>
              </div>

              <YearHeatmap
                habits={activeHabits}
                selectedHabitId={selectedHabitId}
                onCellClick={(cell) => setSelectedCell(cell)}
              />
              
              {selectedCell && (
                <div className="rounded-[4px] border border-base-850 bg-base-950 p-4 mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-[fade-in_0.15s_ease-out]">
                  <div>
                    <h4 className="text-[13px] font-semibold text-base-200 font-mono mb-1">
                      Activity Details: {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(selectedCell.dateStr + 'T00:00:00'))}
                    </h4>
                    <p className="text-[11px] text-base-500 font-mono">
                      {selectedCell.completedCount} out of {activeHabits.length} habits completed
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {activeHabits.map(h => {
                      const completed = (h.completions || []).some(c => new Date(c.periodStart).toISOString().split('T')[0] === selectedCell.dateStr)
                      return (
                        <div
                          key={h.id}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border text-[11px] font-mono",
                            completed
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-medium"
                              : "bg-base-900 border-base-800 text-base-500"
                          )}
                        >
                          <div className={cn("size-1.5 rounded-full", completed ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-base-750")} />
                          <span>{h.title}</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedCell(null)}
                    className="text-[11px] text-base-400 hover:text-base-200 font-mono underline cursor-pointer self-end md:self-auto"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[11px] font-semibold text-base-500 font-mono uppercase tracking-wider mb-3">
                All Active Habits ({activeHabits.length})
              </h3>
              {activeHabits.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeHabits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    isExpanded={expandedId === habit.id}
                    onToggleExpand={() => handleToggleExpand(habit.id)}
                    stats={expandedId === habit.id ? stats : undefined}
                    statsLoading={expandedId === habit.id ? statsLoading : false}
                    onComplete={() => completeMutation.mutate(habit.id)}
                    onDelete={() => setDeleteTarget({ id: habit.id, title: habit.title })}
                    completePending={completeMutation.isPending && completeMutation.variables === habit.id}
                    deletePending={deleteMutation.isPending && deleteMutation.variables === habit.id}
                  />
                ))}
              </div>
            )}
          </div>

          {inactiveHabits.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-medium text-base-500 uppercase tracking-wider font-mono">Archived</span>
                  <span className="text-[10px] text-base-600 font-mono">{inactiveHabits.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50">
                  {inactiveHabits.map(habit => (
                    <div key={habit.id} className="rounded-[4px] border border-base-800 bg-surface p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[14px] font-medium text-base-400 font-mono truncate line-through">{habit.title}</h3>
                        </div>
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono border shrink-0', FREQ_COLORS[habit.frequency])}>
                          {FREQ_LABELS[habit.frequency]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <CreateHabitDialog open={showCreate} onClose={() => setShowCreate(false)} />
        <AICreateDialog open={showAiCreate} onClose={() => setShowAiCreate(false)} />

        <Dialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.id)
              setDeleteTarget(null)
            }
          }}
          title="Delete habit"
          message={`Delete "${deleteTarget?.title}"? This will remove the habit and all its completion history.`}
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          icon={<AlertTriangle className="size-5 text-red-400" />}
        />
      </div>
    </div>
  )
}
