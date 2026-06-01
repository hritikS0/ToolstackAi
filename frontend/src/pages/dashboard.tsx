import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/store/auth'
import { dashboardService } from '@/services/dashboard.service'
import { formatRelativeTime, truncate } from '@/lib/utils'
import {
  MessageSquare, FileText, Image, Bug, Terminal, Brain, Sparkles, Target,
  Trophy, Wrench, Heart, BookOpen,
  FolderOpen,
} from 'lucide-react'
import type { DashboardData } from '@/types/api'

const quickActions = [
  { icon: MessageSquare, label: 'New Chat', path: '/chat', key: '⌘1' },
  { icon: FileText, label: 'Upload PDF', path: '/pdf', key: '⌘2' },
  { icon: Image, label: 'Image Analysis', path: '/image', key: '⌘3' },
  { icon: Bug, label: 'Code Debugger', path: '/debug', key: '⌘4' },
]

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof MessageSquare; color: string }) {
  return (
    <div className="rounded-[4px] border border-base-800 bg-surface px-3 py-2.5 hover:border-base-700 transition-colors cursor-default">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`size-3.5 ${color}`} />
        <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-semibold text-base-100 font-mono tabular-nums">{value}</span>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: d, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardService.get()).data,
  })

  const isEmpty = !dashLoading && (!d || (d.stats.conversations === 0 && d.stats.memories === 0 && d.stats.images === 0 && d.stats.debugSessions === 0))
  const firstName = user?.fullName?.split(' ')[0] || 'developer'

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-full flex flex-col">

        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-base-800 text-[10px] text-base-500 mb-6 font-mono">
                <Terminal className="size-3" />
                developer operating system
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-base-100 mb-2 font-mono"
            
              >
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
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] text-[11px] font-medium text-base-400 bg-surface border border-base-800 hover:text-base-200 hover:bg-base-800 hover:border-base-700 transition-all"
                  >
                    <a.icon className="size-3.5" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : dashLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-medium text-base-100 font-mono">Dashboard</h1>
                <p className="text-[11px] text-base-500 mt-0.5 font-mono">
                  ~/welcome back, {firstName}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {quickActions.slice(0, 4).map((a) => (
                  <button type="button"
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] text-[11px] font-medium text-base-400 bg-surface border border-base-800 hover:text-base-200 hover:bg-base-800 transition-all"
                  >
                    <a.icon className="size-3.5" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              <StatCard label="Conversations" value={d.stats.conversations} icon={MessageSquare} color="text-accent" />
              <StatCard label="PDFs" value={d.stats.pdfs} icon={FileText} color="text-emerald-400" />
              <StatCard label="Images" value={d.stats.images} icon={Image} color="text-cyan-400" />
              <StatCard label="Debug" value={d.stats.debugSessions} icon={Bug} color="text-amber-400" />
              <StatCard label="Memories" value={d.stats.memories} icon={Brain} color="text-violet-400" />
              <StatCard label="Projects" value={d.projects.length} icon={BookOpen} color="text-blue-400" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-3">
                {d.recentConversations.length > 0 && (
                  <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
                    <div className="flex items-center justify-between h-[34px] px-3 border-b border-base-800 bg-surface-alt">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-base-500" />
                        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Recent Conversations</span>
                      </div>
                      <button type="button" onClick={() => navigate('/conversations')} className="text-[10px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5">
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
                          <span className="flex-1 text-[11px] text-base-300 font-mono truncate">{truncate(c.title, 40)}</span>
                          <span className="text-[9px] text-base-600 font-mono shrink-0">{formatRelativeTime(c.createdAt)}</span>
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
                        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Recent Memory Updates</span>
                      </div>
                      <button type="button" onClick={() => navigate('/brain')} className="text-[10px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5">
                        view all <ChevronRight className="size-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-base-800">
                      {d.recentMemories.map((m) => (
                        <div key={m.id} className="flex items-center gap-2.5 px-3 py-2">
                          <span className="text-[9px] font-medium text-base-400 font-mono uppercase tracking-wider w-20 shrink-0">{m.category}</span>
                          <span className="flex-1 text-[11px] text-base-300 font-mono truncate">{m.title}</span>
                          <span className="text-[9px] text-base-600 font-mono shrink-0">{formatRelativeTime(m.updatedAt)}</span>
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
                    <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Brain Snapshot</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {d.brain.name ? (
                      <div className="flex items-start gap-2">
                        <Sparkles className="size-3.5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">{d.brain.nameTitle || 'Name'}</span>
                          <p className="text-[11px] text-base-200 font-mono">{d.brain.name}</p>
                        </div>
                      </div>
        ) : dashLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
                      <div className="text-center py-2">
                        <Sparkles className="size-4 text-base-700 mx-auto mb-1" />
                        <p className="text-[10px] text-base-600 font-mono">No identity saved yet</p>
                      </div>
                    )}

                    {d.brain.skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Wrench className="size-3 text-base-500" />
                          <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {d.brain.skills.map((s) => (
                            <span key={s.title} className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono bg-base-800/50 border border-base-700 text-base-300">
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
                          <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Goals</span>
                        </div>
                        <div className="space-y-0.5">
                          {d.brain.goals.map((g) => (
                            <div key={g.title} className="flex items-center gap-1.5 text-[10px] text-base-400 font-mono">
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
                          <span className="text-[10px] text-base-500 font-mono uppercase tracking-wider">Preferences</span>
                        </div>
                        <div className="space-y-0.5">
                          {d.brain.preferences.map((p) => (
                            <div key={p.title} className="flex items-center gap-1.5 text-[10px] text-base-400 font-mono">
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
                        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Active Projects</span>
                      </div>
                      <button type="button" onClick={() => navigate('/brain')} className="text-[10px] text-base-500 hover:text-base-300 font-mono transition-colors flex items-center gap-0.5">
                        brain <ChevronRight className="size-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-base-800">
                      {d.projects.map((p) => (
                        <div key={p.id} className="px-3 py-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-base-200 font-mono">{p.title}</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`h-1 w-1 rounded-full ${i < p.importance ? 'bg-accent' : 'bg-base-700'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-base-500 font-mono line-clamp-2">{p.content}</p>
                          <div className="flex items-center gap-1 text-[9px] text-base-600 font-mono">
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
        )}
      </div>
    </div>
  )
}
