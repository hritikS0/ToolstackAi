import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mediaService } from '@/services/media.service'
import { filesService } from '@/services/files.service'
import { Dialog } from '@/components/ui/dialog'
import { formatRelativeTime } from '@/lib/utils'
import {
  Image, Trash2, Loader2, AlertTriangle,
  MessageSquare, FileImage, FileText, ExternalLink,
} from 'lucide-react'
import type { MediaItem } from '@/types/api'

export function MediaPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteTargetType, setDeleteTargetType] = useState<'image' | 'pdf'>('image')

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => (await mediaService.getMedia()).data || [],
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      if (type === 'pdf') return filesService.deleteFile(id)
      return mediaService.deleteMedia(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setDeleteTarget(null)
      setSelectedMedia(null)
    },
  })

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Image className="size-4 text-base-500" />
          <h1 className="text-sm font-medium text-base-100 font-mono">Media</h1>
          <span className="text-[10px] text-base-600 font-mono ml-1">({media.length} files)</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="size-5 animate-spin text-base-500" />
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Image className="size-10 text-base-700 mb-3" />
            <p className="text-[12px] text-base-500 font-mono mb-1">No media files yet</p>
            <p className="text-[11px] text-base-600 font-mono">Images sent in chat or analyzed will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {media.map((m) => (
              <div
                key={m.id}
                className="rounded-[4px] border border-base-800 bg-surface overflow-hidden hover:border-base-600 transition-colors group"
              >
                <div
                  className="aspect-square bg-base-950 flex items-center justify-center overflow-hidden cursor-pointer relative"
                  onClick={() => { if (m.fileType === 'image' && m.url) setSelectedMedia(m) }}
                >
                  {m.fileType === 'pdf' || !m.url ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-base-600 p-4">
                      {m.fileType === 'pdf' ? <FileText className="size-10" /> : <FileImage className="size-10" />}
                      <span className="text-[9px] font-mono uppercase tracking-wider">{m.fileType}</span>
                    </div>
                  ) : (
                    <img
                      src={m.url}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ExternalLink className="size-4 text-white" />
                  </div>
                </div>
                <div className="px-2 py-1.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-base-400 truncate flex-1" title={m.name}>
                      {m.name.length > 20 ? m.name.slice(0, 17) + '...' : m.name}
                    </span>
                    <button type="button"
                      onClick={() => { setDeleteTarget(m.id); setDeleteTargetType(m.fileType) }}
                      className="size-5 flex items-center justify-center rounded-[2px] text-base-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-base-600 font-mono">
                      {m.source === 'chat' ? 'chat' : m.type}
                    </span>
                    <span className="text-[9px] text-base-600 font-mono">
                      {formatRelativeTime(m.createdAt)}
                    </span>
                  </div>
                  {m.conversationId && (
                    <button type="button"
                      onClick={() => navigate(`/chat/${m.conversationId}`)}
                      className="flex items-center gap-1 text-[9px] text-accent hover:text-accent-hover font-mono transition-colors"
                    >
                      <MessageSquare className="size-2.5" />
                      Go to chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedMedia && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setSelectedMedia(null)}
          >
            <div
              className="max-w-[80vw] max-h-[85vh] rounded-[6px] border border-base-800 bg-surface overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between h-9 px-3 border-b border-base-800">
                <div className="flex items-center gap-2">
                  {selectedMedia.fileType === 'pdf' ? <FileText className="size-3.5 text-base-500" /> : <FileImage className="size-3.5 text-base-500" />}
                  <span className="text-[11px] text-base-300 font-mono truncate max-w-[300px]">{selectedMedia.name}</span>
                </div>
                <button type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="size-5 flex items-center justify-center rounded-[2px] text-base-500 hover:text-base-200"
                >
                  ✕
                </button>
              </div>
              {selectedMedia.fileType === 'pdf' || !selectedMedia.url ? (
                <div className="flex items-center justify-center p-16 bg-base-950">
                  {selectedMedia.fileType === 'pdf' ? (
                    <div className="text-center">
                      <FileText className="size-16 text-base-600 mx-auto mb-3" />
                      <p className="text-[11px] text-base-500 font-mono">{selectedMedia.name}</p>
                      {selectedMedia.url && (
                        <a href={selectedMedia.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-[11px] text-accent hover:text-accent-hover font-mono">
                          <ExternalLink className="size-3" /> Open PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <FileImage className="size-16 text-base-600" />
                  )}
                </div>
              ) : (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              <div className="flex items-center justify-between h-9 px-3 border-t border-base-800 text-[10px] text-base-500 font-mono">
                <span>{formatRelativeTime(selectedMedia.createdAt)}</span>
                <div className="flex items-center gap-2">
                  {selectedMedia.conversationId && (
                    <button type="button" onClick={() => { navigate(`/chat/${selectedMedia.conversationId}`); setSelectedMedia(null) }}
                      className="flex items-center gap-1 hover:text-accent transition-colors">
                      <MessageSquare className="size-3" /> Go to conversation
                    </button>
                  )}
                  <button type="button" onClick={() => { setDeleteTarget(selectedMedia.id); setDeleteTargetType(selectedMedia.fileType); setSelectedMedia(null) }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => { if (deleteTarget) deleteMutation.mutate({ id: deleteTarget, type: deleteTargetType }) }}
          title="Delete Media"
          message="This will permanently delete this file."
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          icon={<AlertTriangle className="size-5 text-red-400" />}
        />
      </div>
    </div>
  )
}
