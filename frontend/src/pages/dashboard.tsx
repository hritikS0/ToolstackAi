import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { dashboardService } from '@/services/dashboard.service'
import { briefingService } from '@/services/briefing.service'
import { habitsService } from '@/services/habits.service'
import { formatRelativeTime, truncate, cn } from '@/lib/utils'
import {
  MessageSquare, FileText, Image, Bug, Terminal, Brain, Sparkles, Target,
  Trophy, Wrench, Heart, BookOpen,
  FolderOpen, ChevronRight, CheckSquare, Flame, Clock, AlertTriangle, CheckCircle2, Circle,
  KeyRound, Settings, ArrowRight, Palette
} from 'lucide-react'
import type { DashboardData, BriefingData, Habit } from '@/types/api'
import { keysService } from '@/services/keys.service'

const quickActions = [
  { icon: MessageSquare, label: 'New Chat', path: '/chat', key: 'k1' },
  { icon: FileText, label: 'Upload PDF', path: '/pdf', key: 'k2' },
  // { icon: Image, label: 'Image Analysis', path: '/image', key: 'k3' },
  // { icon: Bug, label: 'Code Debugger', path: '/debug', key: 'k4' },
]

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof MessageSquare; color: string }) {
  return (
    <div className="rounded-[4px] border border-base-800 bg-surface px-3 py-2.5 hover:border-base-700 transition-colors cursor-default min-w-0">
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <Icon className={`size-3.5 ${color} shrink-0`} />
        <span className="text-[13px] text-base-500 font-mono uppercase tracking-wider truncate">{label}</span>
      </div>
      <span className="text-xl font-semibold text-base-100 font-mono tabular-nums">{value}</span>
    </div>
  )
}

const priorityBadge = (priority: string) => {
  const map: Record<string, { color: string; bg: string }> = {
    critical: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
    high: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
    low: { color: 'text-base-500', bg: 'bg-base-800 border-base-700' },
  }
  const style = map[priority] || map.low
  return (
    <span className={`text-[11px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] border ${style.bg} ${style.color}`}>
      {priority}
    </span>
  )
}

function BriefingSection({ icon: Icon, title, children, action }: { icon: typeof MessageSquare; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
      <div className="flex items-center h-[34px] px-3 border-b border-base-800 bg-surface-alt gap-2">
        <Icon className="size-3.5 text-base-500" />
        <span className="text-[13px] font-medium text-base-400 uppercase tracking-wider font-mono">{title}</span>
        {action && <div className="ml-auto flex items-center">{action}</div>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function OnboardingDashboard({ firstName }: { firstName: string }) {
  const navigate = useNavigate()

  const checklistItems = [
    { label: 'Add API Key', desc: 'Connect NVIDIA, OpenAI, or any provider', path: '/settings?tab=api-keys', icon: KeyRound },
    { label: 'Send First Message', desc: 'Start a conversation with AI', path: '/chat', icon: MessageSquare },
    { label: 'Create First Project', desc: 'Organize your work into projects', path: '/projects', icon: FolderOpen },
    { label: 'Create First Habit', desc: 'Build daily routines and streaks', path: '/habits', icon: Flame },
    { label: 'Explore Themes', desc: 'Customize your workspace look', path: '/settings?tab=theme', icon: Palette },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="text-center pt-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-base-800 bg-surface text-[13px] text-base-500 mb-4 font-mono">
            <Terminal className="size-3 text-accent" />
            developer operating system
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-base-100 mb-1 font-mono">
            Welcome, <span className="text-accent">{firstName}</span>
          </h1>
          <p className="text-sm text-base-400 font-mono mb-8">Your workspace is ready. Let's get you set up.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="size-4 text-accent" />
            <span className="text-sm font-semibold text-base-200 font-mono uppercase tracking-wider">Getting Started</span>
          </div>

          {checklistItems.map((item, i) => (
            <button
              type="button"
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 w-full p-3 rounded-[4px] border border-base-800 bg-surface hover:border-accent/30 hover:bg-base-800/30 transition-all duration-200 text-left group"
            >
              <div className="flex items-center justify-center size-7 rounded-[4px] bg-base-800/50 border border-base-700 text-base-400 group-hover:bg-accent/10 group-hover:border-accent/20 group-hover:text-accent transition-all shrink-0">
                <span className="text-xs font-mono font-semibold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <item.icon className="size-3.5 text-base-500 group-hover:text-base-300 transition-colors" />
                  <span className="text-sm font-medium text-base-200 font-mono">{item.label}</span>
                </div>
                <p className="text-xs text-base-500 mt-0.5 font-mono">{item.desc}</p>
              </div>
              <ArrowRight className="size-3.5 text-base-700 group-hover:text-accent transition-colors shrink-0" />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="primary" size="sm" onClick={() => navigate('/settings?tab=api-keys')}>
            <KeyRound className="size-3.5" />
            Add API Key
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/chat')}>
            <MessageSquare className="size-3.5" />
            Start Chatting
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyDashboard({ firstName }: { firstName: string }) {
  const navigate = useNavigate()
  return (
    <div className="h-full overflow-y-auto">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-base-800 text-[13px] text-base-500 mb-6 font-mono">
              <Terminal className="size-3" />
              developer operating system
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-base-100 mb-2 font-mono">
              ToolStack<span className="text-accent">AI</span>
            </h1>

            <p className="text-[13px] text-base-400 mb-8 font-mono leading-relaxed max-w-md mx-auto">
              ~/welcome, {firstName}
            </p>

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {quickActions.map((a) => (
                <button type="button"
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] text-[14px] font-medium text-base-400 bg-surface border border-base-800 hover:text-base-200 hover:bg-base-800 hover:border-base-700 transition-all"
                >
                  <a.icon className="size-3.5" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.fullName?.split(' ')[0] || 'developer'

  const { data: keysStatus } = useQuery({
    queryKey: ['keysStatus'],
    queryFn: async () => {
      try {
        return (await keysService.getKeysStatus()).data
      } catch {
        return { hasKeys: false }
      }
    },
  })

  const hasApiKeys = keysStatus?.hasKeys ?? true

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      try {
        return (await habitsService.list()).data || []
      } catch {
        return []
      }
    }
  })

  const briefing = useQuery({
    queryKey: ['briefing'],
    queryFn: async () => {
      try {
        return (await briefingService.get()).data
      } catch {
        return null
      }
    },
  })

  const legacy = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        return (await dashboardService.get()).data
      } catch {
        return null
      }
    },
    enabled: briefing.data === null || briefing.isError,
  })

  const isLoading = briefing.isLoading || (legacy.isEnabled && legacy.isLoading)

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  const data = briefing.data
  const legacyData = legacy.data

  if (data) {
    const b = data as BriefingData
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-base-100 font-mono">
                {b.greeting}, {b.firstName}.
              </h1>
              <p className="text-[14px] text-base-500 mt-0.5 font-mono">
                {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(b.date))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {quickActions.map((a) => (
                <button type="button"
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] text-[14px] font-medium text-base-400 bg-surface border border-base-800 hover:text-base-200 hover:bg-base-800 transition-all"
                >
                  <a.icon className="size-3.5" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Tasks" value={b.stats.tasks} icon={CheckSquare} color="text-accent" />
            <StatCard label="Habits" value={b.stats.habits} icon={Flame} color="text-orange-400" />
            <StatCard label="Projects" value={b.stats.projects} icon={FolderOpen} color="text-blue-400" />
            <StatCard label="Goals" value={b.stats.goals} icon={Target} color="text-emerald-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="col-span-2 space-y-3">
              <BriefingSection icon={CheckSquare} title="Today's Focus">
                {b.tasks.overdue > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="size-3.5 text-red-400" />
                      <span className="text-[13px] text-red-400 font-mono uppercase tracking-wider">
                        {b.tasks.overdue} overdue task{b.tasks.overdue !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {b.tasks.topTasks
                      .filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
                      .slice(0, 3)
                      .map((t) => (
                        <button type="button" key={t.id}
                          onClick={() => navigate('/tasks')}
                          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[4px] bg-red-400/5 border border-red-400/20 hover:bg-red-400/10 transition-colors text-left"
                        >
                          <Clock className="size-3.5 text-red-400 shrink-0" />
                          <span className="flex-1 text-[14px] text-base-200 font-mono truncate">{t.title}</span>
                          {priorityBadge(t.priority)}
                        </button>
                      ))}
                  </div>
                )}
                {b.tasks.topTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="size-3.5 text-accent" />
                      <span className="text-[13px] text-accent font-mono uppercase tracking-wider">
                        Top priorities
                      </span>
                    </div>
                    {b.tasks.topTasks.map((t) => (
                      <button type="button" key={t.id}
                        onClick={() => navigate('/tasks')}
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[4px] hover:bg-base-800/40 transition-colors text-left group"
                      >
                        <div className="size-1.5 rounded-full bg-base-600 group-hover:bg-accent transition-colors shrink-0" />
                        <span className="flex-1 text-[14px] text-base-300 font-mono truncate">{t.title}</span>
                        {priorityBadge(t.priority)}
                      </button>
                    ))}
                  </div>
                )}
                {b.tasks.topTasks.length === 0 && (
                  <p className="text-[13px] text-base-600 font-mono py-2">No open tasks. Enjoy the clear deck.</p>
                )}
              </BriefingSection>

              <BriefingSection
                icon={Flame}
                title="Habits"
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/habits')}
                    className="text-[12px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5 ml-auto cursor-pointer"
                  >
                    view details <ChevronRight className="size-3" />
                  </button>
                }
              >
                {b.habits.habits.length > 0 ? (
                  <div className="space-y-1.5">
                    {b.habits.habits.map((h) => {
                      const fullHabit = (habits as Habit[]).find(fh => fh.id === h.id)
                      const comps = fullHabit?.completions || []
                      const completedDates = new Set(comps.map(c => new Date(c.periodStart).toISOString().split('T')[0]))

                      return (
                        <button
                          type="button"
                          key={h.id}
                          onClick={() => navigate(`/habits?id=${h.id}`)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] hover:bg-base-800/40 hover:text-base-100 transition-colors text-left w-full cursor-pointer"
                        >
                          {h.todayCompleted ? (
                            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="size-4 text-base-600 shrink-0" />
                          )}
                          <span className={`flex-1 text-[14px] font-mono truncate ${h.todayCompleted ? 'text-base-400 line-through' : 'text-base-200'}`}>
                            {h.title}
                          </span>
                          {h.currentStreak !== undefined && h.currentStreak > 0 && (
                            <span className="flex items-center gap-1 text-[12px] text-orange-400 font-mono shrink-0 mr-2">
                              <Flame className="size-3" />
                              {h.currentStreak}
                            </span>
                          )}

                          {/* 2 rows, 7 columns compact heatmap */}
                          <div className="grid grid-rows-2 grid-flow-col gap-[2px] shrink-0 mr-3">
                            {Array.from({ length: 14 }).map((_, idx) => {
                              const d = new Date()
                              d.setDate(d.getDate() - (13 - idx))
                              const dStr = d.toISOString().split('T')[0]
                              const completed = completedDates.has(dStr)
                              return (
                                <div
                                  key={idx}
                                  className={cn(
                                    "size-[6px] rounded-[0.5px] transition-all",
                                    completed ? "bg-accent" : "bg-base-850 border border-base-800/50"
                                  )}
                                />
                              )
                            })}
                          </div>

                          <span className="text-[12px] text-base-600 font-mono uppercase shrink-0">{h.frequency}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-base-600 font-mono py-2">No active habits.</p>
                )}
                {b.habits.total > 0 && (
                  <div className="mt-2 text-[12px] text-base-500 font-mono">
                    {b.habits.completed}/{b.habits.total} completed today
                  </div>
                )}
              </BriefingSection>
            </div>

            <div className="space-y-3">
              {b.aiSuggestion && (
                <BriefingSection icon={Sparkles} title="AI Recommendation">
                  <p className="text-[14px] text-base-300 font-mono leading-relaxed">{b.aiSuggestion}</p>
                </BriefingSection>
              )}

              <BriefingSection icon={FolderOpen} title="Projects">
                {b.projects.projects.length > 0 ? (
                  <div className="space-y-1.5">
                    {b.projects.projects.map((p) => (
                      <div key={p.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] hover:bg-base-800/40 transition-colors"
                      >
                        <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#f59e0b' }} />
                        <span className="flex-1 text-[14px] text-base-200 font-mono truncate">{p.name}</span>
                        <span className="text-[12px] text-base-600 font-mono tabular-nums">{p.taskCount}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-base-600 font-mono py-2">No active projects.</p>
                )}
              </BriefingSection>

              <BriefingSection icon={Clock} title="Recent Activity">
                {b.recentActivity.length > 0 ? (
                  <div className="space-y-0">
                    {b.recentActivity.slice(0, 8).map((activity, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5">
                        <div className="mt-1 size-1.5 rounded-full bg-base-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-base-200 font-mono truncate">{activity.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[12px] text-base-500 font-mono">{activity.action}</span>
                            <span className="text-[12px] text-base-700 font-mono">{formatRelativeTime(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-base-600 font-mono py-2">No recent activity.</p>
                )}
              </BriefingSection>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (legacyData) {
    const d = legacyData as DashboardData
    const isEmpty = d.stats.conversations === 0 && d.stats.memories === 0 && d.stats.images === 0 && d.stats.debugSessions === 0

    if (isEmpty && !hasApiKeys) {
      return <OnboardingDashboard firstName={firstName} />
    }

    if (isEmpty) {
      return <EmptyDashboard firstName={firstName} />
    }

    return (
      <div className="h-full overflow-y-auto">
        <div className="h-full flex flex-col">
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-sm font-medium text-base-100 font-mono">Dashboard</h1>
                <p className="text-[14px] text-base-500 mt-0.5 font-mono">
                  ~/welcome back, {firstName}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {quickActions.slice(0, 4).map((a) => (
                  <button type="button"
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] text-[14px] font-medium text-base-400 bg-surface border border-base-800 hover:text-base-200 hover:bg-base-800 transition-all"
                  >
                    <a.icon className="size-3.5" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard label="Conversations" value={d.stats.conversations} icon={MessageSquare} color="text-accent" />
              <StatCard label="PDFs" value={d.stats.pdfs} icon={FileText} color="text-emerald-400" />
              {/* <StatCard label="Images" value={d.stats.images} icon={Image} color="text-cyan-400" /> */}
              {/* <StatCard label="Debug" value={d.stats.debugSessions} icon={Bug} color="text-amber-400" /> */}
              <StatCard label="Memories" value={d.stats.memories} icon={Brain} color="text-violet-400" />
              <StatCard label="Projects" value={d.projects.length} icon={BookOpen} color="text-blue-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="col-span-2 space-y-3">
                {d.recentConversations.length > 0 && (
                  <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                    <div className="flex items-center justify-between h-[34px] px-3 border-b border-base-800 bg-surface-alt">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-base-500" />
                        <span className="text-[13px] font-medium text-base-400 uppercase tracking-wider font-mono">Recent Conversations</span>
                      </div>
                      <button type="button" onClick={() => navigate('/conversations')} className="text-[13px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5">
                        view all <ChevronRight className="size-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-base-800">
                      {d.recentConversations.map((c) => (
                        <button type="button"
                          key={c.id}
                          onClick={() => navigate(c.type === 'pdf' ? `/pdf/${c.id}` : `/chat/${c.id}`)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-base-800/40 transition-colors text-left"
                        >
                          {c.type === 'pdf' ? <FileText className="size-3.5 text-base-500 shrink-0" /> : <MessageSquare className="size-3.5 text-base-500 shrink-0" />}
                          <span className="flex-1 text-[14px] text-base-300 font-mono truncate">{truncate(c.title, 40)}</span>
                          <span className="text-[12px] text-base-600 font-mono shrink-0">{formatRelativeTime(c.createdAt)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {d.recentMemories.length > 0 && (
                  <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                    <div className="flex items-center justify-between h-[34px] px-3 border-b border-base-800 bg-surface-alt">
                      <div className="flex items-center gap-2">
                        <Brain className="size-3.5 text-base-500" />
                        <span className="text-[13px] font-medium text-base-400 uppercase tracking-wider font-mono">Recent Memory Updates</span>
                      </div>
                      <button type="button" onClick={() => navigate('/brain')} className="text-[13px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5">
                        view all <ChevronRight className="size-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-base-800">
                      {d.recentMemories.map((m) => (
                        <div key={m.id} className="flex items-center gap-2.5 px-3 py-2">
                          <span className="text-[12px] font-medium text-base-400 font-mono uppercase tracking-wider w-20 shrink-0">{m.category}</span>
                          <span className="flex-1 text-[14px] text-base-300 font-mono truncate">{m.title}</span>
                          <span className="text-[12px] text-base-600 font-mono shrink-0">{formatRelativeTime(m.updatedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                  <div className="flex items-center h-[34px] px-3 border-b border-base-800 bg-surface-alt gap-2">
                    <Brain className="size-3.5 text-accent" />
                    <span className="text-[13px] font-medium text-base-400 uppercase tracking-wider font-mono">Brain Snapshot</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {d.brain.name ? (
                      <div className="flex items-start gap-2">
                        <Sparkles className="size-3.5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[13px] text-base-500 font-mono uppercase tracking-wider">{d.brain.nameTitle || 'Name'}</span>
                          <p className="text-[14px] text-base-200 font-mono">{d.brain.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Sparkles className="size-4 text-base-700 mx-auto mb-1" />
                        <p className="text-[13px] text-base-600 font-mono">No identity saved yet</p>
                      </div>
                    )}

                    {d.brain.skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Wrench className="size-3 text-base-500" />
                          <span className="text-[13px] text-base-500 font-mono uppercase tracking-wider">Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {d.brain.skills.map((s) => (
                            <span key={s.title} className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[13px] font-mono bg-base-800/50 border border-base-700 text-base-300">
                              {s.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.brain.goals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Trophy className="size-3 text-base-500" />
                          <span className="text-[13px] text-base-500 font-mono uppercase tracking-wider">Goals</span>
                        </div>
                        <div className="space-y-0.5">
                          {d.brain.goals.map((g) => (
                            <div key={g.title} className="flex items-center gap-1.5 text-[13px] text-base-400 font-mono">
                              <div className="size-1.5 rounded-full bg-accent shrink-0" />
                              <span className="truncate">{g.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.brain.preferences.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Heart className="size-3 text-base-500" />
                          <span className="text-[13px] text-base-500 font-mono uppercase tracking-wider">Preferences</span>
                        </div>
                        <div className="space-y-0.5">
                          {d.brain.preferences.map((p) => (
                            <div key={p.title} className="flex items-center gap-1.5 text-[13px] text-base-400 font-mono">
                              <Target className="size-3 text-base-500 shrink-0" />
                              <span className="truncate">{p.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {d.projects.length > 0 && (
                  <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                    <div className="flex items-center justify-between h-[34px] px-3 border-b border-base-800 bg-surface-alt gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-3.5 text-base-500" />
                        <span className="text-[13px] font-medium text-base-400 uppercase tracking-wider font-mono">Active Projects</span>
                      </div>
                      <button type="button" onClick={() => navigate('/brain')} className="text-[13px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5">
                        brain <ChevronRight className="size-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-base-800">
                      {d.projects.map((p) => (
                        <div key={p.id} className="px-3 py-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-medium text-base-200 font-mono">{p.title}</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`h-1 w-1 rounded-full ${i < p.importance ? 'bg-accent' : 'bg-base-700'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[14px] text-base-500 font-mono line-clamp-2">{p.content}</p>
                          <div className="flex items-center gap-1 text-[12px] text-base-600 font-mono">
                            <FolderOpen className="size-3" />
                            <span>{formatRelativeTime(p.updatedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!hasApiKeys) {
    return <OnboardingDashboard firstName={firstName} />
  }

  return <EmptyDashboard firstName={firstName} />
}
