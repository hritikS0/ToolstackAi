import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/chat.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { Search, MessageSquare, Trash2, Pencil, Check, X, Loader2, Calendar, ArrowUpDown, AlertTriangle, Terminal } from 'lucide-react'

export function ConversationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'createdAt' | 'title'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const pendingNav = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await chatService.getConversations(100, 0)).data || [],
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => chatService.updateConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setEditingId(null)
    },
  })

  const filtered = conversations
    .filter(c => c.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = sortField === 'createdAt' ? a.createdAt : (a.title || '')
      const bVal = sortField === 'createdAt' ? b.createdAt : (b.title || '')
      return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
    })

  const toggleSort = (field: 'createdAt' | 'title') => {
    if (sortField === field) setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const handleTitleClick = (id: string, type: string | undefined, title: string) => {
    if (pendingNav.current?.id === id) {
      clearTimeout(pendingNav.current.timer)
      pendingNav.current = null
      setEditingId(id)
      setEditTitle(title || '')
    } else {
      if (pendingNav.current) clearTimeout(pendingNav.current.timer)
      pendingNav.current = {
        id,
        timer: setTimeout(() => {
          pendingNav.current = null
          navigate(type === 'pdf' ? `/pdf/${id}` : `/chat/${id}`)
        }, 250),
      }
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="size-4 text-base-500" />
          <h1 className="text-sm font-medium text-base-100 font-mono">History</h1>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-base-600" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-8 h-7 text-[11px] font-mono" />
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => toggleSort('createdAt')} className="gap-1 text-[11px]">
              <Calendar className="size-3.5" /> Date
            </Button>
            <Button variant="ghost" size="sm" onClick={() => toggleSort('title')} className="gap-1 text-[11px]">
              <ArrowUpDown className="size-3.5" /> Name
            </Button>
          </div>
        </div>

        {isLoading ? <TableSkeleton rows={6} /> : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="size-8 text-base-700 mx-auto mb-2" />
            <p className="text-[11px] text-base-600 font-mono">{search ? 'No results' : 'No conversations yet'}</p>
          </div>
        ) : (
          <div className="rounded-[4px] border border-base-800 bg-surface overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-base-800">
                  <th className="text-left px-3 py-1.5 text-[10px] text-base-500 font-medium uppercase tracking-wider">Name</th>
                  <th className="text-left px-3 py-1.5 text-[10px] text-base-500 font-medium uppercase tracking-wider">Created</th>
                  <th className="text-right px-3 py-1.5 text-[10px] text-base-500 font-medium uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-base-800/50 hover:bg-base-800/30 transition-colors">
                    <td className="px-3 py-1.5">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-1">
                          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                            className="h-6 text-[11px] font-mono min-w-[200px]" autoFocus
                            disabled={renameMutation.isPending}
                            onKeyDown={e => {
                              if (e.key === 'Enter') renameMutation.mutate({ id: c.id, title: editTitle })
                              if (e.key === 'Escape') setEditingId(null)
                            }} />
                          <Button variant="ghost" size="icon" className="size-6" disabled={renameMutation.isPending} onClick={() => renameMutation.mutate({ id: c.id, title: editTitle })}>
                            {renameMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 text-accent" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditingId(null)}><X className="size-3" /></Button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => handleTitleClick(c.id, c.type, c.title || '')} className="text-[11px] text-base-200 hover:text-base-100 cursor-pointer text-left">{truncate(c.title || 'Untitled', 50)}</button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-base-500">{formatRelativeTime(c.createdAt)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="gap-1 text-[11px]" onClick={() => { setEditingId(c.id); setEditTitle(c.title || '') }}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 text-red-400" onClick={() => setDeleteTarget(c.id)}>
                          {deleteMutation.isPending && deleteMutation.variables === c.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget); setDeleteTarget(null) } }}
        title="Delete conversation"
        message="This will permanently delete the conversation and all its messages."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        icon={<AlertTriangle className="size-5 text-red-400" />}
      />
    </div>
  )
}
