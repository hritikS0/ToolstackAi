import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesService } from '@/services/notes.service'
import { formatRelativeTime, truncate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  FileText, Plus, Search, Tag, Trash2, Loader2, Sparkles,
  AlertTriangle, ExternalLink, ArrowLeft, X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Note } from '@/types/api'

export function NotesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showList, setShowList] = useState(true)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const [summary, setSummary] = useState<string | null>(null)
  const [extractResult, setExtractResult] = useState<{ tasksCreated: number } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')

  const prevNoteIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const editorLoadedRef = useRef(false)

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchInput])

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes', debouncedSearch, tagFilter],
    queryFn: async () => {
      const res = await notesService.list({
        search: debouncedSearch || undefined,
        tag: tagFilter || undefined,
      })
      return res.data || []
    },
  })

  const { data: selectedNote, isLoading: noteLoading } = useQuery({
    queryKey: ['note', selectedId],
    queryFn: async () => {
      if (!selectedId) return null
      const res = await notesService.getById(selectedId)
      return res.data || null
    },
    enabled: !!selectedId,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title: string; content: string }> }) =>
      notesService.update(id, data),
    onSuccess: (res) => {
      setSaving(false)
      if (res.data) setLastSaved(res.data.updatedAt)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (title: string) => notesService.create({ title, content: '' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowCreateDialog(false)
      setNewNoteTitle('')
      if (res.data) {
        setSelectedId(res.data.id)
        if (window.innerWidth < 768) setShowList(false)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedId(null)
      setDeleteTarget(null)
      prevNoteIdRef.current = null
    },
  })

  const summarizeMutation = useMutation({
    mutationFn: (id: string) => notesService.summarize(id),
    onSuccess: (res) => {
      if (res.data?.summary) {
        setSummary(res.data.summary)
        setAiError(null)
      }
    },
    onError: () => setAiError('Failed to summarize note'),
  })

  const extractTasksMutation = useMutation({
    mutationFn: (id: string) => notesService.extractTasks(id),
    onSuccess: (res) => {
      if (res.data) {
        setExtractResult(res.data)
        setAiError(null)
      }
    },
    onError: () => setAiError('Failed to extract tasks'),
  })

  const triggerSave = useCallback((t: string, c: string) => {
    if (!selectedId) return
    setSaving(true)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateMutation.mutate({ id: selectedId, data: { title: t, content: c } })
    }, 1000)
  }, [selectedId, updateMutation])

  useEffect(() => {
    if (!selectedNote || selectedNote.id === prevNoteIdRef.current) return
    setTitle(selectedNote.title)
    setContent(selectedNote.content)
    setLastSaved(selectedNote.updatedAt)
    setSummary(null)
    setExtractResult(null)
    setAiError(null)
    setActiveTab('edit')
    setDeleteTarget(null)
    setSaving(false)
    prevNoteIdRef.current = selectedNote.id
  }, [selectedNote])

  useEffect(() => {
    editorLoadedRef.current = false
    if (!selectedId) return
    const t = setTimeout(() => { editorLoadedRef.current = true }, 50)
    return () => clearTimeout(t)
  }, [selectedId])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (editorLoadedRef.current) triggerSave(val, content)
  }, [content, triggerSave])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    if (editorLoadedRef.current) triggerSave(title, val)
  }, [title, triggerSave])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [notes])

  const selectNote = useCallback((note: Note) => {
    setSelectedId(note.id)
    if (window.innerWidth < 768) setShowList(false)
  }, [])

  const handleNewNote = () => {
    setNewNoteTitle('')
    setShowCreateDialog(true)
  }

  const createNote = () => {
    if (!newNoteTitle.trim()) return
    createMutation.mutate(newNoteTitle.trim())
  }

  const cancelCreate = () => {
    setShowCreateDialog(false)
    setNewNoteTitle('')
  }

  const handleBackToList = useCallback(() => {
    setShowList(true)
    setSelectedId(null)
  }, [])

  const formatSavedTime = (ts: string | null) => {
    if (!ts) return ''
    return `Saved ${formatRelativeTime(ts)}`
  }

  return (
    <div className="h-full overflow-hidden flex">
      <div className={cn(
        'w-full md:w-72 shrink-0 border-r border-base-800 bg-surface flex flex-col',
        showList ? 'flex' : 'hidden md:flex',
      )}>
        <div className="p-3 border-b border-base-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-base-600" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-8 pl-7 pr-3 rounded-[4px] border border-base-800 bg-base-900 text-[13px] text-base-100 placeholder:text-base-600 font-mono focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleNewNote}
            loading={createMutation.isPending}
          >
            <Plus className="size-3.5" />
            New Note
          </Button>
        </div>

        {showCreateDialog && (
          <div className="px-3 pb-2">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full h-8 px-2 rounded-[4px] border border-base-800 bg-base-900 text-[13px] font-mono text-base-100 placeholder:text-base-600 focus:outline-none focus:border-accent/50 transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNote()
                if (e.key === 'Escape') cancelCreate()
              }}
            />
            <div className="flex gap-1 mt-1">
              <Button size="sm" onClick={createNote} loading={createMutation.isPending}>
                Create
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelCreate}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {allTags.length > 0 && (
          <div className="px-3 py-2 border-b border-base-800 flex flex-wrap gap-1">
            {tagFilter && (
              <button
                type="button"
                onClick={() => setTagFilter('')}
                className="flex items-center gap-0.5 h-5 px-1.5 rounded-[2px] text-[12px] font-mono bg-accent text-neutral-950"
              >
                <X className="size-2.5" />
                Clear
              </button>
            )}
            {allTags.map(tag => (
              <button
                type="button"
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                className={cn(
                  'flex items-center gap-1 h-5 px-1.5 rounded-[2px] text-[12px] font-mono transition-colors',
                  tagFilter === tag
                    ? 'bg-accent text-neutral-950'
                    : 'bg-base-800/60 text-base-400 border border-base-700 hover:text-base-200 hover:border-base-600',
                )}
              >
                <Tag className="size-2.5" />
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {notesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="size-4 text-base-600 animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-base-600">
              <FileText className="size-5" />
              <span className="text-[13px] font-mono">
                {debouncedSearch || tagFilter ? 'No notes match filters' : 'No notes yet'}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-base-800">
              {notes.map(note => (
                <button
                  type="button"
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 transition-colors',
                    selectedId === note.id
                      ? 'bg-accent-muted border-l-2 border-l-accent'
                      : 'hover:bg-base-800/60 border-l-2 border-l-transparent',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-base-200 font-mono truncate">
                      {note.title || 'Untitled'}
                    </span>
                    <span className="text-[12px] text-base-600 font-mono shrink-0 mt-0.5">
                      {formatRelativeTime(note.updatedAt)}
                    </span>
                  </div>
                  {note.content && (
                    <p className="text-[12px] text-base-500 font-mono truncate mb-1.5">
                      {truncate(note.content.replace(/[#*`>\-\n]/g, '').trim(), 60)}
                    </p>
                  )}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map(t => (
                        <span key={t} className="inline-flex items-center h-4 px-1 rounded-[2px] text-[11px] font-mono bg-base-800/60 text-base-500 border border-base-700">
                          {t}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-[12px] text-base-600 font-mono ml-0.5">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        showList ? 'hidden md:flex' : 'flex',
      )}>
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="size-8 text-base-700 mx-auto mb-3" />
              <p className="text-[13px] text-base-500 font-mono mb-2">Select a note or create a new one</p>
              <Button variant="primary" size="sm" onClick={handleNewNote} loading={createMutation.isPending}>
                <Plus className="size-3.5" />
                New Note
              </Button>
            </div>
          </div>
        ) : noteLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-5 text-base-600 animate-spin" />
          </div>
        ) : selectedNote ? (
          <>
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-base-800">
              <button
                type="button"
                onClick={handleBackToList}
                className="md:hidden size-7 flex items-center justify-center rounded-[4px] text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Note title..."
                className="flex-1 bg-transparent text-[17px] text-base-100 font-mono placeholder:text-base-600 focus:outline-none"
              />
            </div>

            <div className="shrink-0 flex items-center gap-0.5 px-3 border-b border-base-800">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={cn(
                  'text-[12px] font-mono px-2.5 py-1.5 border-b-2 transition-colors',
                  activeTab === 'edit'
                    ? 'border-accent text-base-100'
                    : 'border-transparent text-base-500 hover:text-base-300',
                )}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'text-[12px] font-mono px-2.5 py-1.5 border-b-2 transition-colors',
                  activeTab === 'preview'
                    ? 'border-accent text-base-100'
                    : 'border-transparent text-base-500 hover:text-base-300',
                )}
              >
                Preview
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {aiError && (
                <div className="mx-3 mt-3 p-2.5 rounded-[4px] border border-red-500/20 bg-red-500/10 flex items-start gap-2">
                  <AlertTriangle className="size-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[14px] text-red-300 font-mono">{aiError}</p>
                </div>
              )}

              {summary && (
                <div className="mx-3 mt-3 p-2.5 rounded-[4px] border border-accent/20 bg-accent-muted">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="size-3.5 text-accent" />
                    <span className="text-[13px] font-medium text-accent font-mono uppercase tracking-wider">
                      AI Summary
                    </span>
                  </div>
                  <p className="text-[14px] text-base-200 font-mono leading-relaxed">{summary}</p>
                </div>
              )}

              {extractResult && (
                <div className="mx-3 mt-3 p-2.5 rounded-[4px] border border-accent/20 bg-accent-muted">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="size-3.5 text-accent" />
                    <span className="text-[13px] font-medium text-accent font-mono uppercase tracking-wider">
                      Tasks Extracted
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] text-base-200 font-mono">
                      Created {extractResult.tasksCreated} task{extractResult.tasksCreated !== 1 ? 's' : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/tasks')}
                      className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline font-mono"
                    >
                      View tasks
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'edit' ? (
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="# Start writing markdown..."
                  className="w-full h-full min-h-[300px] bg-transparent text-[14px] text-base-100 font-mono leading-relaxed placeholder:text-base-600 focus:outline-none resize-none p-3"
                />
              ) : (
                <div className="p-3 prose prose-invert prose-sm max-w-none font-mono
                  prose-headings:text-base-100 prose-headings:font-mono
                  prose-p:text-base-300 prose-p:leading-relaxed
                  prose-code:bg-base-800 prose-code:text-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded-[2px] prose-code:text-[13px]
                  prose-pre:bg-base-900 prose-pre:border prose-pre:border-base-800
                  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                  prose-blockquote:border-accent/40 prose-blockquote:text-base-400
                  prose-li:text-base-300
                  prose-strong:text-base-100
                  prose-hr:border-base-800
                  prose-img:rounded-[4px]
                  [&_table]:border-collapse [&_th]:border [&_th]:border-base-700 [&_th]:px-2 [&_th]:py-1
                  [&_td]:border [&_td]:border-base-700 [&_td]:px-2 [&_td]:py-1"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {content || '*No content*'}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div className="shrink-0 h-9 flex items-center justify-between px-3 border-t border-base-800 bg-surface">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[13px] font-mono transition-colors',
                  saving ? 'text-accent' : 'text-base-600',
                )}>
                  {saving ? 'Saving...' : formatSavedTime(lastSaved)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => summarizeMutation.mutate(selectedNote.id)}
                  loading={summarizeMutation.isPending}
                  className="text-[12px]"
                >
                  <Sparkles className="size-3" />
                  Summarize
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => extractTasksMutation.mutate(selectedNote.id)}
                  loading={extractTasksMutation.isPending}
                  className="text-[12px]"
                >
                  <ExternalLink className="size-3" />
                  Extract Tasks
                </Button>
                {deleteTarget === selectedNote.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] text-base-500 font-mono">Are you sure?</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => deleteMutation.mutate(selectedNote.id)}
                      loading={deleteMutation.isPending}
                      className="h-6 text-[11px] bg-red-600 hover:bg-red-700"
                    >
                      Yes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(null)}
                      className="h-6 text-[11px]"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(selectedNote.id)}
                    className="text-base-500 hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
