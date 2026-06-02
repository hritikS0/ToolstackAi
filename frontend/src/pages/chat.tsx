import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/chat.service'
import { Button } from '@/components/ui/button'
import { Composer } from '@/components/chat/composer'
import { MessageBlock } from '@/components/chat/message-block'
import { formatRelativeTime } from '@/lib/utils'
import { MessageSquare, Plus, Loader2, AlertTriangle, X, BrainCircuit } from 'lucide-react'
import type { Message, Conversation } from '@/types/api'

const THINKING_MESSAGES = [
  'Thinking...',
  'Processing results...',
  'Analyzing context...',
  'Reviewing information...',
  'Working through it...',
  'Looking into that...',
]

export function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string } | null>(null)
  const [localImagePreviews, setLocalImagePreviews] = useState<Record<string, string>>({})
  const [brainNoti, setBrainNoti] = useState<string | null>(null)
  const brainNotiTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const [showConvList, setShowConvList] = useState(true)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingMessage, setThinkingMessage] = useState(THINKING_MESSAGES[0])
  const thinkingRef = useRef({
    active: false,
    startedAt: 0,
    minMs: 400,
    pendingContent: '',
    timerId: null as ReturnType<typeof setTimeout> | null,
  })
  const thinkingMsgInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIdRef = useRef(id)

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await chatService.getConversations()).data || [],
  })

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      if (!id) return []
      const res = await chatService.getMessages(id)
      return (res.data || []) as Message[]
    },
    enabled: !!id,
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streamingContent, optimisticUserMsg, isStreaming, scrollToBottom])

  const scheduleRender = useCallback((content: string) => {
    contentRef.current = content

    if (thinkingRef.current.active) {
      const elapsed = Date.now() - thinkingRef.current.startedAt
      if (elapsed >= thinkingRef.current.minMs) {
        thinkingRef.current.active = false
        setIsThinking(false)
        if (thinkingRef.current.timerId) {
          clearTimeout(thinkingRef.current.timerId)
          thinkingRef.current.timerId = null
        }
      } else {
        thinkingRef.current.pendingContent = content
        if (!thinkingRef.current.timerId) {
          const remaining = thinkingRef.current.minMs - elapsed
          thinkingRef.current.timerId = setTimeout(() => {
            thinkingRef.current.timerId = null
            thinkingRef.current.active = false
            setIsThinking(false)
            const pending = thinkingRef.current.pendingContent
            thinkingRef.current.pendingContent = ''
            contentRef.current = pending
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
            setStreamingContent(pending)
          }, remaining + 30)
        }
        return
      }
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setStreamingContent(contentRef.current)
      })
    }
  }, [])

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isStreaming) return
    let convId = id
    if (!convId) {
      const res = await chatService.createConversation()
      if (res.data?.conversation) {
        convId = res.data.conversation.id
        navigate(`/chat/${convId}`, { replace: true })
        console.log('[chat] created conversation', convId)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    }
    if (!convId) return

    const msg = input.trim() || '(Image analysis)'
    console.log('[chat] send start', { msg, convId })
    setInput('')
    setStreamingContent('')
    setStreamError(null)
    setIsStreaming(true)
    contentRef.current = ''
    setIsThinking(true)
    thinkingRef.current = {
      active: true,
      startedAt: Date.now(),
      minMs: 350 + Math.floor(Math.random() * 350),
      pendingContent: '',
      timerId: null,
    }

    if (attachedImage) {
      const imgPreview = attachedImage.preview
      console.log('[chat] optimistic user msg (image)', msg)
      setOptimisticUserMsg(msg)
      setLocalImagePreviews(prev => ({ ...prev, [msg]: imgPreview }))
      setAttachedImage(null)
      try {
        const res = await chatService.visionChat({ message: msg, conversationId: convId, image: attachedImage.file })
        if (res.success && res.data) {
          setStreamingContent(res.data.answer)
          console.log('[chat] vision response received')
          if (res.data.memorySaved && res.data.memorySaved > 0) {
            setBrainNoti(`Saved ${res.data.memorySaved} ${res.data.memorySaved === 1 ? 'memory' : 'memories'} to Brain`)
            if (brainNotiTimer.current) clearTimeout(brainNotiTimer.current)
            brainNotiTimer.current = setTimeout(() => setBrainNoti(null), 4000)
          }
        }
      } catch (err) {
        const errMsg = typeof err === 'object' && err !== null && 'response' in err
          ? String((err as any).response?.data?.message || (err as any).message || 'Vision request failed.')
          : err instanceof Error ? err.message : 'Vision request failed.'
        setStreamError(errMsg)
      } finally {
        console.log('[chat] vision complete, refetching messages')
        setIsStreaming(false)
        if (thinkingRef.current.timerId) clearTimeout(thinkingRef.current.timerId)
        thinkingRef.current.active = false
        setIsThinking(false)
        queryClient.invalidateQueries({ queryKey: ['messages', convId] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
      return
    }

    console.log('[chat] optimistic user msg', msg)
    setOptimisticUserMsg(msg)
    let fullContent = ''
    let failed = false
    try {
      console.log('[chat] stream start')
      await chatService.streamChat(
        { message: msg, conversationId: convId },
        (chunk: string) => {
          fullContent += chunk
          scheduleRender(fullContent)
        },
        (saved: number) => {
          console.log('[chat] brain memory saved', saved)
          setBrainNoti(`Saved ${saved} ${saved === 1 ? 'memory' : 'memories'} to Brain`)
          if (brainNotiTimer.current) clearTimeout(brainNotiTimer.current)
          brainNotiTimer.current = setTimeout(() => setBrainNoti(null), 4000)
        },
      )
      console.log('[chat] stream end', { contentLength: fullContent.length })
    } catch (err) {
      failed = true
      console.log('[chat] stream error', err)
      const errMsg = typeof err === 'object' && err !== null && 'response' in err
        ? String((err as any).response?.data?.message || (err as any).message || 'Connection failed.')
        : err instanceof Error ? err.message : 'Connection failed.'
      setStreamError(errMsg)
    } finally {
      console.log('[chat] stream complete', { failed, hasContent: !!fullContent })
      setIsStreaming(false)
      if (thinkingRef.current.timerId) clearTimeout(thinkingRef.current.timerId)
      thinkingRef.current.active = false
      setIsThinking(false)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      contentRef.current = ''

      if (failed && !fullContent) {
        setStreamingContent('')
      }

      queryClient.invalidateQueries({ queryKey: ['messages', convId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  }

  const handleAttachImage = () => {
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setAttachedImage({ file, preview })
    e.target.value = ''
  }



  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id
      setLocalImagePreviews({})
      if (!isStreaming) {
        setOptimisticUserMsg(null)
        setStreamingContent('')
        setStreamError(null)
      }
    }
  }, [id, isStreaming])

  useEffect(() => {
    if (!isThinking) {
      if (thinkingMsgInterval.current) {
        clearInterval(thinkingMsgInterval.current)
        thinkingMsgInterval.current = null
      }
      return
    }
    let i = 0
    setThinkingMessage(THINKING_MESSAGES[0])
    thinkingMsgInterval.current = setInterval(() => {
      i = (i + 1) % THINKING_MESSAGES.length
      setThinkingMessage(THINKING_MESSAGES[i])
    }, 2200)
    return () => {
      if (thinkingMsgInterval.current) {
        clearInterval(thinkingMsgInterval.current)
        thinkingMsgInterval.current = null
      }
    }
  }, [isThinking])

  useEffect(() => {
    return () => {
      if (brainNotiTimer.current) clearTimeout(brainNotiTimer.current)
      if (thinkingMsgInterval.current) clearInterval(thinkingMsgInterval.current)
      if (thinkingRef.current.timerId) clearTimeout(thinkingRef.current.timerId)
    }
  }, [])

  const currentConv = conversations.find(c => c.id === id)

  return (
    <div className="flex h-full">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      {showConvList && (
        <div className="w-52 border-r border-base-800 bg-surface flex flex-col shrink-0">
          <div className="h-[37px] border-b border-base-800 flex items-center justify-between px-2">
            <span className="text-[10px] font-medium text-base-500 uppercase tracking-wider">Conversations</span>
            <Button variant="ghost" size="icon" className="size-5" onClick={() => setShowConvList(false)}>
              <X className="size-3" />
            </Button>
          </div>
          <div className="p-1.5">
            <Button variant="secondary" size="sm" className="w-full" onClick={async () => {
              const res = await chatService.createConversation()
              if (res.data?.conversation) navigate(`/chat/${res.data.conversation.id}`)
            }}>
              <Plus className="size-3.5" />
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5">
            {(conversations as Conversation[]).filter(c => c.type !== 'pdf').map(c => (
              <button type="button"
                key={c.id}
                onClick={() => navigate(`/chat/${c.id}`)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-[2px] text-[11px] text-left group ${
                  c.id === id ? 'bg-accent-muted text-accent' : 'text-base-500 hover:bg-base-800 hover:text-base-300'
                }`}
              >
                <MessageSquare className="size-3.5 shrink-0" />
                <span className="truncate flex-1">{c.title || 'New Chat'}</span>
                <span className="text-[9px] text-base-600 shrink-0 font-mono">{formatRelativeTime(c.createdAt)}</span>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-[11px] text-base-600 text-center py-6">No conversations</p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {!id ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="size-8 text-base-700 mx-auto mb-3" />
              <p className="text-[11px] text-base-500 mb-3">Select a conversation or create a new one</p>
              <div className="flex items-center gap-2 justify-center">
                <Button variant="primary" size="sm" onClick={async () => {
                  const res = await chatService.createConversation()
                  if (res.data?.conversation) navigate(`/chat/${res.data.conversation.id}`)
                }}>
                  <Plus className="size-3.5" />
                  New Chat
                </Button>
                {!showConvList && (
                  <Button variant="ghost" size="sm" onClick={() => setShowConvList(true)}>
                    Show List
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-workspace">
            {isLoading && messages.length === 0 && !optimisticUserMsg && !isStreaming && !isThinking && !streamingContent ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-4 animate-spin text-base-500" />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto py-4 px-4 space-y-4">
                {(messages as Message[]).filter(m => {
                  if (optimisticUserMsg && m.role === 'user' && m.content === optimisticUserMsg) return false
                  if (streamingContent && m.role === 'assistant' && m.content === streamingContent) return false
                  return true
                }).map(msg => (
                  <MessageBlock
                    key={msg.id}
                    role={msg.role as 'user' | 'assistant'}
                    content={msg.content}
                    timestamp={msg.createdAt ? formatRelativeTime(msg.createdAt) : undefined}
                    imageUrl={msg.role === 'user' ? (localImagePreviews[msg.content] || undefined) : undefined}
                  />
                ))}

                {optimisticUserMsg && (
                  <MessageBlock
                    key="optimistic-user"
                    role="user"
                    content={optimisticUserMsg}
                    imageUrl={localImagePreviews[optimisticUserMsg] || undefined}
                  />
                )}

                {(isStreaming || streamingContent) && (
                  <MessageBlock
                    key="live-response"
                    role="assistant"
                    content={streamingContent}
                    isStreaming={isStreaming}
                    isThinking={isThinking}
                    thinkingMessage={thinkingMessage}
                    timestamp={isStreaming && streamingContent ? undefined : ''}
                  />
                )}

                {streamError && !isStreaming && (
                  <div className="rounded-[4px] border border-red-500/30 bg-red-500/5 px-3 py-2">
                    <div className="flex items-start gap-2 text-[11px] text-red-400">
                      <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                      <span>{streamError}</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        {brainNoti && (
          <div className="flex items-center justify-center py-1.5 bg-accent-muted border-t border-accent/20 animate-fade-in">
            <div className="flex items-center gap-1.5 text-[11px] text-accent font-mono">
              <BrainCircuit className="size-3.5" />
              <span>{brainNoti}</span>
            </div>
          </div>
        )}

        {id && (
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isStreaming}
            placeholder={isStreaming ? 'Waiting for response...' : 'Type a message...'}
            attachedImage={attachedImage || undefined}
            onAttachImage={handleAttachImage}
            onRemoveImage={() => {
              if (attachedImage) URL.revokeObjectURL(attachedImage.preview)
              setAttachedImage(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
