import { useState } from 'react'
import type { Memory } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Pin, PinOff, Trash2, X, Save, Check, Sparkles, Clock, Target, BookOpen } from 'lucide-react'

interface MemoryDetailPanelProps {
  memory: Memory | null
  onUpdate: (id: string, data: Partial<Memory>) => Promise<void>
  onDelete: (id: string) => void
  onClose: () => void
}

const categoryIcons: Record<string, typeof BookOpen> = {
  Identity: Sparkles,
  Preferences: Target,
  Projects: BookOpen,
  Goals: Target,
  Skills: BookOpen,
  Work: BookOpen,
  Personal: Sparkles,
}

export function MemoryDetailPanel({ memory, onUpdate, onDelete, onClose }: MemoryDetailPanelProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  if (!memory) {
    return (
      <div className="w-72 border-l border-base-800 bg-surface flex items-center justify-center p-4">
        <p className="text-[11px] text-base-600 font-mono text-center">Select a memory to view details</p>
      </div>
    )
  }

  const CatIcon = categoryIcons[memory.category] || BookOpen

  const startEdit = () => {
    setTitle(memory.title)
    setContent(memory.content)
    setEditing(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    await onUpdate(memory.id, { title, content })
    setSaving(false)
    setEditing(false)
  }

  const importanceStars = Array.from({ length: 5 }, (_, i) => i < memory.importance)

  return (
    <div className="w-72 border-l border-base-800 bg-surface flex flex-col shrink-0">
      <div className="flex items-center justify-between h-[37px] px-3 border-b border-base-800">
        <span className="text-[10px] font-medium text-base-400 uppercase tracking-wider font-mono">Details</span>
        <button type="button" onClick={onClose} className="size-5 flex items-center justify-center rounded-[2px] text-base-500 hover:text-base-200 hover:bg-base-800 transition-colors">
          <X className="size-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center gap-2">
          <CatIcon className="size-4 text-base-500" />
          <span className="text-[10px] font-mono text-base-400 uppercase tracking-wider">{memory.category}</span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-7 text-[12px] font-mono" autoFocus />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full h-20 rounded-[2px] border border-base-800 bg-base-950 px-2 py-1 text-[11px] font-mono text-base-200 outline-none focus:border-accent/40 resize-none"
            />
            <div className="flex items-center gap-1">
              <Button variant="primary" size="sm" onClick={saveEdit} loading={saving}>
                <Save className="size-3" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-base-100 font-mono">{memory.title}</h3>
                <button type="button" onClick={startEdit} className="size-5 flex items-center justify-center rounded-[2px] text-base-500 hover:text-base-200 hover:bg-base-800">
                  <Pencil className="size-3" />
                </button>
              </div>
              <p className="text-[11px] text-base-400 font-mono mt-1 leading-relaxed">{memory.content}</p>
            </div>

            <div className="border-t border-base-800 pt-2 space-y-2">
              {memory.source && (
                <div>
                  <span className="text-[9px] text-base-600 font-mono uppercase tracking-wider">Source</span>
                  <p className="text-[10px] text-base-400 font-mono mt-0.5">{memory.source}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-base-600 font-mono uppercase tracking-wider">Importance</span>
                <div className="flex gap-0.5">
                  {importanceStars.map((filled, i) => (
                    <span key={i} className={`size-2 rounded-full ${filled ? 'bg-accent' : 'bg-base-700'}`} />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] text-base-600 font-mono uppercase tracking-wider">Confidence</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1 rounded-[2px] bg-base-800 overflow-hidden">
                    <div
                      className="h-full rounded-[2px] bg-accent transition-all"
                      style={{ width: `${Math.round(memory.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-base-400">{Math.round(memory.confidence * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-base-600 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{new Date(memory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-base-800 p-2 space-y-1">
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start text-[11px]"
          onClick={() => onUpdate(memory.id, { pinned: !memory.pinned })}
        >
          {memory.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          {memory.pinned ? 'Unpin' : 'Pin'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => onDelete(memory.id)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}
