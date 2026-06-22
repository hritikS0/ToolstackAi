import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { chatService } from '@/services/chat.service'
import { Button } from '@/components/ui/button'
import { Composer } from '@/components/chat/composer'
import { MessageBlock } from '@/components/chat/message-block'
import { formatRelativeTime, cn } from '@/lib/utils'
import { MessageSquare, Plus, Loader2, AlertTriangle, BrainCircuit, Bug, Code, Lightbulb, Sparkles, Globe, KeyRound, Settings, ArrowRight } from 'lucide-react'
import type { Message, Conversation } from '@/types/api'
import { motion } from 'framer-motion'
import { keysService } from '@/services/keys.service'

const THINKING_MESSAGES = [
  'Thinking...',
  'Processing results...',
  'Analyzing context...',
  'Reviewing information...',
  'Working through it...',
  'Looking into that...',
]

const STARTERS = [
  {
    icon: Bug,
    title: 'Analyze & Debug Code',
    description: 'Find bugs, logical errors, or clean up messy code snippets.',
    prompt: 'Can you analyze this code and identify any potential bugs or performance bottlenecks?\n\n```\n// Paste your code here\n```'
  },
  {
    icon: Code,
    title: 'Generate Functions',
    description: 'Write boilerplate, helpers, or specific logic in any language.',
    prompt: 'Write a helper function to do the following:\n- '
  },
  {
    icon: Lightbulb,
    title: 'Explain Complex Logic',
    description: 'Understand deep code flows, patterns, or architecture.',
    prompt: 'Can you explain how this concept works in detail with examples?\n- '
  },
  {
    icon: Sparkles,
    title: 'Optimize Performance',
    description: 'Refactor algorithms or database queries to run faster.',
    prompt: 'How can I optimize the performance of this code/query?\n\n'
  }
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
  const localImagePreviewsRef = useRef(localImagePreviews)
  localImagePreviewsRef.current = localImagePreviews
  const [brainNoti, setBrainNoti] = useState<string | null>(null)
  const brainNotiTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef('')
  const rafRef = useRef<number | null>(null)

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

  const [streamingSources, setStreamingSources] = useState<{ title: string; url: string; description?: string }[] | null>(null)

  const toggleSearchMutation = useMutation({
    mutationFn: async ({ id, settings }: { id: string; settings: any }) => {
      return chatService.updateConversation(id, { settings })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await chatService.getConversations(100, 0)).data || [],
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
    setStreamingSources(null)
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
        await queryClient.refetchQueries({ queryKey: ['messages', convId] })
        setOptimisticUserMsg(null)
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
        { message: msg, conversationId: convId, tools: { webSearch: webSearchEnabled } },
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
        (sources: { title: string; url: string; description?: string }[]) => {
          console.log('[chat] stream sources', sources)
          setStreamingSources(sources)
        }
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
      for (const url of Object.values(localImagePreviewsRef.current)) {
        URL.revokeObjectURL(url)
      }
      if (brainNotiTimer.current) clearTimeout(brainNotiTimer.current)
      if (thinkingMsgInterval.current) clearInterval(thinkingMsgInterval.current)
      if (thinkingRef.current.timerId) clearTimeout(thinkingRef.current.timerId)
    }
  }, [])

  const currentConv = conversations.find(c => c.id === id)
  const currentSettings = currentConv?.settings || {}
  const webSearchEnabled = !!currentSettings.webSearch
  const isWelcomeConversation = !!currentSettings.isWelcome
  const hasApiKeys = keysStatus?.hasKeys ?? true

  return (
    <div className="flex h-full">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!id ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <MessageSquare className="size-8 text-base-700 mx-auto mb-3" />
              <p className="text-[14px] text-base-500 mb-3">Select a conversation or create a new one</p>
              <div className="flex items-center gap-2 justify-center flex-wrap">
                <Button variant="primary" size="sm" onClick={async () => {
                  const res = await chatService.createConversation()
                  if (res.data?.conversation) navigate(`/chat/${res.data.conversation.id}`)
                }}>
                  <Plus className="size-3.5" />
                  New Chat
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between h-12 px-4 border-b border-base-800 bg-surface/50 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="size-4 text-base-500 shrink-0" />
                <span className="hidden sm:inline text-[13px] font-semibold text-base-200 font-mono truncate">
                  {currentConv?.title || 'Untitled Chat'}
                </span>
              </div>
              <button
                type="button"
                disabled={toggleSearchMutation.isPending}
                onClick={() => {
                  const currentSettings = currentConv?.settings || {}
                  toggleSearchMutation.mutate({
                    id: id!,
                    settings: { ...currentSettings, webSearch: !currentSettings.webSearch },
                  })
                }}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[4px] border text-[11px] font-mono transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  webSearchEnabled
                    ? 'border-accent/40 bg-accent-muted text-accent font-semibold shadow-[0_0_8px_rgba(var(--accent-rgb),0.08)]'
                    : 'border-base-750 bg-base-900/60 text-base-400 hover:text-base-200 hover:border-base-700'
                )}
              >
                <Globe className={cn('size-3.5', webSearchEnabled && 'animate-pulse')} />
                <span>WEB SEARCH: {webSearchEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-workspace">
            {isLoading && messages.length === 0 && !optimisticUserMsg && !isStreaming && !isThinking && !streamingContent ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-4 animate-spin text-base-500" />
              </div>
            ) : messages.length === 0 && !optimisticUserMsg && !isStreaming && !isThinking && !streamingContent ? (
              <div className="flex flex-col items-center justify-center min-h-full py-12 px-6 text-center max-w-2xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center w-full"
                >
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-accent/20 blur-md animate-pulse" />
                    <div className="relative size-16 rounded-[4px] border border-base-700 bg-base-950 flex items-center justify-center text-accent">
                      <BrainCircuit className="size-8" />
                    </div>
                  </div>
                  
                  <h1 className="text-base sm:text-lg font-semibold text-base-100 tracking-tight font-mono mb-2">
                    New Chat Session
                  </h1>
                  
                  <p className="text-[13px] text-base-400 max-w-md mb-8 leading-relaxed font-mono">
                    Ask a question, paste code to debug, or try one of the quick starters below to begin.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                    {STARTERS.map((starter, index) => {
                      const Icon = starter.icon
                      return (
                        <button
                          key={index}
                          onClick={() => setInput(starter.prompt)}
                          className="flex flex-col items-start p-4 text-left rounded-[4px] border border-base-800 bg-base-950 hover:border-accent/40 hover:bg-base-900 transition-all duration-200 cursor-pointer group w-full"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="size-4 text-base-400 group-hover:text-accent transition-colors duration-200" />
                            <span className="text-[13px] font-semibold text-base-200 group-hover:text-base-50 transition-colors duration-200 font-mono">
                              {starter.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-base-500 leading-normal group-hover:text-base-400 transition-colors duration-200 font-mono">
                            {starter.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto py-5 px-5 space-y-5">
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
                    imageUrl={msg.role === 'user' ? (msg.chatMedia?.url || localImagePreviews[msg.content] || undefined) : undefined}
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
                    sources={streamingSources || undefined}
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

                {isWelcomeConversation && !hasApiKeys && (
                  <div className="rounded-[4px] border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-[4px] bg-amber-500 flex items-center justify-center">
                        <KeyRound className="size-3.5 text-neutral-950" />
                      </div>
                      <span className="text-sm font-semibold text-amber-400 font-mono">Connect an AI provider to get started</span>
                    </div>
                    <p className="text-sm text-neutral-400 font-mono leading-relaxed">
                      Add an API key from NVIDIA, OpenAI, Anthropic, or any supported provider to unlock AI-powered chat, document analysis, and more.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="primary" size="sm" onClick={() => navigate('/settings?tab=api-keys')}>
                        <KeyRound className="size-3.5" />
                        Add API Key
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate('/settings?tab=api-keys')}>
                        <Settings className="size-3.5" />
                        Open Settings
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/chat/${id}`)}>
                        <ArrowRight className="size-3.5" />
                        Explore Workspace
                      </Button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
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

        {id && !hasApiKeys ? (
          <div className="shrink-0 border-t border-base-800 bg-base-950/60 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-[4px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <KeyRound className="size-3.5 text-amber-400" />
                </div>
                <p className="text-sm text-neutral-400 font-mono truncate">
                  <span className="text-amber-400 font-semibold">No API key configured</span> — add one in settings to start chatting
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/settings?tab=api-keys')}>
                <Settings className="size-3.5" />
                Setup
              </Button>
            </div>
          </div>
        ) : id ? (
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
        ) : null}
      </div>
    </div>
  )
}
