import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsService } from '@/services/goals.service'
import { dashboardService } from '@/services/dashboard.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { truncate } from '@/lib/utils'
import type { Goal, Milestone } from '@/types/api'
import {
  Target, Flag, CheckCircle2, Circle, Plus, Trash2, Loader2, Sparkles, AlertTriangle,
  Trophy, X,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  completed: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  archived: 'bg-base-600/10 border-base-600/30 text-base-500',
}

function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const milestones = goal.milestones || []
  const completedMs = milestones.filter(m => m.status === 'completed').length

  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-base-800 bg-surface rounded-[4px] p-4 hover:border-base-700 transition-colors text-left w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[12px] font-medium text-base-100 font-mono truncate">{goal.title}</h3>
        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono border ${statusColors[goal.status] || statusColors.active}`}>
          {goal.status}
        </span>
      </div>

      {goal.description && (
        <p className="text-[11px] text-base-500 font-mono mb-2.5 leading-relaxed line-clamp-2">
          {truncate(goal.description, 100)}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="bg-base-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-base-500 font-mono">
            {milestones.length > 0 ? `${completedMs}/${milestones.length} milestones` : `${goal.progress}%`}
          </span>
          {goal.targetDate && (
            <span className="text-[11px] text-base-600 font-mono">
              {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function GoalsPage() {
  const queryClient = useQueryClient()
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteMilestoneTarget, setDeleteMilestoneTarget] = useState<{ goalId: string; milestoneId: string } | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [newProjectId, setNewProjectId] = useState('')

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [showAddMilestone, setShowAddMilestone] = useState(false)

  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description: string }[] | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)
  const [aiAnalyzeLoading, setAiAnalyzeLoading] = useState(false)

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await goalsService.list()
      return res.data || []
    },
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardService.get()).data,
    staleTime: 30000,
  })

  const projects = dashboardData?.projects || []

  const invalidateGoals = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; targetDate?: string; projectId?: string }) =>
      goalsService.create(data),
    onSuccess: (res) => {
      invalidateGoals()
      setShowCreate(false)
      setNewTitle('')
      setNewDescription('')
      setNewTargetDate('')
      setNewProjectId('')
      if (res.data) setSelectedGoal(res.data)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsService.delete(id),
    onSuccess: () => {
      invalidateGoals()
      setSelectedGoal(null)
      setDeleteTarget(null)
    },
  })

  const addMilestoneMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: { title: string } }) =>
      goalsService.addMilestone(goalId, data),
    onSuccess: () => {
      invalidateGoals()
      setShowAddMilestone(false)
      setNewMilestoneTitle('')
    },
  })

  const toggleMilestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId, data }: { goalId: string; milestoneId: string; data: Partial<Milestone> }) =>
      goalsService.updateMilestone(goalId, milestoneId, data),
    onSuccess: (res) => {
      invalidateGoals()
      if (selectedGoal && res.data) {
        const updatedMilestones = (selectedGoal.milestones || []).map(m =>
          m.id === res.data!.id ? res.data! : m
        )
        const completed = updatedMilestones.filter(m => m.status === 'completed').length
        const progress = updatedMilestones.length > 0 ? Math.round((completed / updatedMilestones.length) * 100) : 0
        setSelectedGoal({ ...selectedGoal, milestones: updatedMilestones, progress })
      }
    },
  })

  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
      goalsService.deleteMilestone(goalId, milestoneId),
    onSuccess: () => {
      invalidateGoals()
      setDeleteMilestoneTarget(null)
      if (selectedGoal) {
        const updatedMilestones = (selectedGoal.milestones || []).filter(
          m => m.id !== deleteMilestoneTarget?.milestoneId
        )
        const completed = updatedMilestones.filter(m => m.status === 'completed').length
        const progress = updatedMilestones.length > 0 ? Math.round((completed / updatedMilestones.length) * 100) : 0
        setSelectedGoal({ ...selectedGoal, milestones: updatedMilestones, progress })
      }
    },
  })

  const handleAiSuggest = async () => {
    if (!selectedGoal) return
    setAiSuggestLoading(true)
    setAiSuggestions(null)
    try {
      const res = await goalsService.aiSuggestMilestones(selectedGoal.id)
      if (res.data?.suggestions) setAiSuggestions(res.data.suggestions)
    } catch { /* ignore */ }
    setAiSuggestLoading(false)
  }

  const handleAiAnalyze = async () => {
    if (!selectedGoal) return
    setAiAnalyzeLoading(true)
    setAiAnalysis(null)
    try {
      const res = await goalsService.aiAnalyzeProgress(selectedGoal.id)
      if (res.data?.analysis) setAiAnalysis(res.data.analysis)
    } catch { /* ignore */ }
    setAiAnalyzeLoading(false)
  }

  const handleAcceptSuggestion = (suggestion: { title: string; description: string }) => {
    if (!selectedGoal) return
    addMilestoneMutation.mutate({
      goalId: selectedGoal.id,
      data: { title: suggestion.title },
    })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-base-500" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-base-500" />
            <h1 className="text-sm font-medium text-base-100 font-mono">Goals</h1>
            <span className="text-[10px] text-base-600 font-mono">({goals.length})</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-3.5" /> New Goal
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Target className="size-8 text-base-700 mb-2" />
            <p className="text-[11px] text-base-600 font-mono mb-3">No goals yet. Create your first goal.</p>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="size-3.5" /> New Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => {
                  setSelectedGoal(goal)
                  setAiSuggestions(null)
                  setAiAnalysis(null)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedGoal(null)}>
          <div
            className="w-[520px] max-h-[85vh] rounded-[6px] border border-base-800 bg-surface shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-10 px-3 border-b border-base-800 shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="size-3.5 text-accent" />
                <span className="text-[11px] font-medium text-base-100 font-mono">{selectedGoal.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedGoal.id)}
                  className="size-6 flex items-center justify-center text-base-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
                  className="size-6 flex items-center justify-center text-base-500 hover:text-base-200"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {selectedGoal.description && (
                <p className="text-[11px] text-base-500 font-mono leading-relaxed">{selectedGoal.description}</p>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-base-600 font-mono uppercase tracking-wider">Progress</span>
                  <span className="text-[11px] text-base-300 font-mono">{selectedGoal.progress}%</span>
                </div>
                <div className="bg-base-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(selectedGoal.progress, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-base-600 font-mono">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] border text-[9px] ${statusColors[selectedGoal.status] || statusColors.active}`}>
                  {selectedGoal.status}
                </span>
                {selectedGoal.targetDate && (
                  <span className="flex items-center gap-1">
                    <Target className="size-3" />
                    {new Date(selectedGoal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {selectedGoal.projectId && (
                  <span>{projects.find(p => p.id === selectedGoal.projectId)?.title || 'Project'}</span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-base-500" />
                    <span className="text-[10px] text-base-600 font-mono uppercase tracking-wider">Milestones</span>
                    <span className="text-[9px] text-base-600 font-mono">
                      ({(selectedGoal.milestones || []).filter(m => m.status === 'completed').length}/{selectedGoal.milestones?.length || 0})
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAddMilestone(true); setNewMilestoneTitle('') }}>
                    <Plus className="size-3" /> Add
                  </Button>
                </div>

                {showAddMilestone && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newMilestoneTitle}
                      onChange={e => setNewMilestoneTitle(e.target.value)}
                      placeholder="Milestone title..."
                      className="h-7 text-[11px] flex-1"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newMilestoneTitle.trim()) {
                          addMilestoneMutation.mutate({
                            goalId: selectedGoal.id,
                            data: { title: newMilestoneTitle.trim() },
                          })
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (newMilestoneTitle.trim()) {
                          addMilestoneMutation.mutate({
                            goalId: selectedGoal.id,
                            data: { title: newMilestoneTitle.trim() },
                          })
                        }
                      }}
                      disabled={!newMilestoneTitle.trim()}
                      loading={addMilestoneMutation.isPending}
                    >
                      Add
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddMilestone(false)}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}

                {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
                  <div className="space-y-0.5">
                    {selectedGoal.milestones
                      .sort((a, b) => a.order - b.order)
                      .map(m => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] border border-base-800 bg-base-950/50 group"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleMilestoneMutation.mutate({
                                goalId: selectedGoal.id,
                                milestoneId: m.id,
                                data: { status: m.status === 'completed' ? 'pending' : 'completed' },
                              })
                            }
                            className="shrink-0 text-base-500 hover:text-accent transition-colors"
                          >
                            {m.status === 'completed' ? (
                              <CheckCircle2 className="size-4 text-emerald-400" />
                            ) : (
                              <Circle className="size-4" />
                            )}
                          </button>
                          <span className={`flex-1 text-[11px] font-mono ${m.status === 'completed' ? 'text-base-500 line-through' : 'text-base-200'}`}>
                            {m.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeleteMilestoneTarget({ goalId: selectedGoal.id, milestoneId: m.id })}
                            className="shrink-0 text-base-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : !showAddMilestone ? (
                  <p className="text-[10px] text-base-600 font-mono py-2">No milestones yet.</p>
                ) : null}
              </div>

              <div className="border-t border-base-800 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAiSuggest}
                    disabled={aiSuggestLoading}
                    className="flex-1"
                  >
                    {aiSuggestLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Suggest Milestones
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAiAnalyze}
                    disabled={aiAnalyzeLoading}
                    className="flex-1"
                  >
                    {aiAnalyzeLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Analyze Progress
                  </Button>
                </div>

                {aiSuggestions && (
                  <div className="rounded-[4px] border border-accent/20 bg-accent/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-accent font-mono uppercase tracking-wider mb-1">
                      <Sparkles className="size-3" />
                      AI Suggestions
                    </div>
                    {aiSuggestions.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-base-950/50 rounded-[2px] px-2 py-1.5 border border-base-800">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-base-200 font-mono">{s.title}</span>
                          {s.description && <p className="text-[10px] text-base-500 font-mono mt-0.5">{s.description}</p>}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptSuggestion(s)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {aiAnalysis && (
                  <div className="rounded-[4px] border border-accent/20 bg-accent/5 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-accent font-mono uppercase tracking-wider mb-2">
                      <Sparkles className="size-3" />
                      Progress Analysis
                    </div>
                    <p className="text-[11px] text-base-300 font-mono leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div
            className="w-[420px] rounded-[6px] border border-base-800 bg-surface shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-10 px-3 border-b border-base-800">
              <div className="flex items-center gap-2">
                <Trophy className="size-3.5 text-accent" />
                <span className="text-[11px] font-medium text-base-100 font-mono">New Goal</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="size-5 flex items-center justify-center text-base-500 hover:text-base-200"
              >
                <Plus className="size-3.5 rotate-45" />
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Goal title"
                className="h-8 text-[12px]"
                autoFocus
              />
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-16 rounded-[4px] border border-base-800 bg-surface px-2 py-1.5 text-[11px] text-base-100 placeholder:text-base-600 font-mono focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
              <div>
                <span className="text-[10px] text-base-500 font-mono block mb-1">Target Date</span>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={e => setNewTargetDate(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
              {projects.length > 0 && (
                <div>
                  <span className="text-[10px] text-base-500 font-mono block mb-1">Project</span>
                  <select
                    value={newProjectId}
                    onChange={e => setNewProjectId(e.target.value)}
                    className="w-full h-8 rounded-[4px] border border-base-800 bg-surface px-2 text-[11px] text-base-100 font-mono focus:outline-none focus:border-accent/50"
                  >
                    <option value="">None</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-3 pb-3">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  createMutation.mutate({
                    title: newTitle.trim(),
                    description: newDescription.trim() || undefined,
                    targetDate: newTargetDate || undefined,
                    projectId: newProjectId || undefined,
                  })
                }
                disabled={!newTitle.trim()}
                loading={createMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget) }}
        title="Delete Goal"
        message="This will permanently delete this goal and all its milestones."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        icon={<AlertTriangle className="size-5 text-red-400" />}
      />

      <Dialog
        open={!!deleteMilestoneTarget}
        onClose={() => setDeleteMilestoneTarget(null)}
        onConfirm={() => { if (deleteMilestoneTarget) deleteMilestoneMutation.mutate(deleteMilestoneTarget) }}
        title="Delete Milestone"
        message="This will permanently delete this milestone."
        confirmLabel="Delete"
        isLoading={deleteMilestoneMutation.isPending}
        icon={<AlertTriangle className="size-5 text-red-400" />}
      />
    </div>
  )
}
