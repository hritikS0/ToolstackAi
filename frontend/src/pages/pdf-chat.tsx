import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { pdfService } from '@/services/pdf.service'
import { chatService } from '@/services/chat.service'
import apiClient from '@/api/client'
import { config } from '@/config'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { Upload, FileText, Send, Loader2, X } from 'lucide-react'
import type { Message, Conversation } from '@/types/api'

export function PdfChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [docId, setDocId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [sending, setSending] = useState(false)
  const [splitPos, setSplitPos] = useState(50)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const dragging = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showPdfList, setShowPdfList] = useState(true)

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await chatService.getConversations()).data || [],
  })

  const pdfConversations = (conversations as Conversation[]).filter(c => c.type === 'pdf')

  const localPdfUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => { if (localPdfUrl) URL.revokeObjectURL(localPdfUrl) }
  }, [localPdfUrl])

  const loadExisting = useCallback(async (conversationId: string) => {
    setLoadingDoc(true)
    setDocId(conversationId)
    try {
      const res = await chatService.getMessages(conversationId)
      const msgs = (res.data || []) as Message[]
      setMessages(msgs.map(m => ({ role: m.role, content: m.content })))

      const token = localStorage.getItem(config.auth.tokenKey)
      const fetchRes = await fetch(
        `${apiClient.defaults.baseURL}/pdf/${conversationId}/file`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      if (fetchRes.ok) {
        const blob = await fetchRes.blob()
        setPdfBlobUrl(URL.createObjectURL(blob))
      }
    } catch {
      setDocId(null)
    } finally {
      setLoadingDoc(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadExisting(id)
    } else {
      setDocId(null)
      setMessages([])
      setFile(null)
      setPdfBlobUrl(null)
      setUploadError(null)
    }
  }, [id, loadExisting])

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl) }
  }, [pdfBlobUrl])

  const handleMouseDown = () => { dragging.current = true }
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return
      const rect = document.querySelector('.pdf-split')?.getBoundingClientRect()
      if (rect) setSplitPos(Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100)))
    }
    const up = () => { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  const handleFile = async (f: File) => {
    setFile(f)
    setUploading(true)
    setUploadError(null)
    setDocId(null)
    setMessages([])
    setPdfBlobUrl(null)
    try {
      const res = await pdfService.uploadPdf(f)
      if (res.success && res.data) {
        const newId = res.data.documentId
        setDocId(newId)
        navigate(`/pdf/${newId}`, { replace: true })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    } catch (err: unknown) {
      setDocId(null)
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending || !docId) return
    setMessages(p => [...p, { role: 'user', content: input.trim() }])
    const msg = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await pdfService.chat({ message: msg, documentId: docId })
      if (res.success && res.data) {
        setMessages(p => [...p, { role: 'assistant', content: res.data!.answer }])
      }
    } catch (err: unknown) {
      const errMsg = typeof err === 'object' && err !== null && 'response' in err
        ? String((err as any).response?.data?.message || (err as any).message || 'Failed to get response.')
        : err instanceof Error ? err.message : 'Failed to get response.'
      setMessages(p => [...p, { role: 'assistant', content: errMsg }])
    } finally {
      setSending(false)
    }
  }

  const displayPdfUrl = pdfBlobUrl || localPdfUrl

  return (
    <div className="flex h-full">
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {showPdfList && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setShowPdfList(false)} />
          <div className="w-52 border-r border-base-800 bg-surface flex flex-col shrink-0 md:flex md:static fixed inset-y-0 left-0 z-50">
            <div className="h-[37px] border-b border-base-800 flex items-center justify-between px-2">
              <span className="text-[12px] font-medium text-base-500 uppercase tracking-wider">Documents</span>
              <Button variant="ghost" size="icon" className="size-5" onClick={() => setShowPdfList(false)}>
                <X className="size-3" />
              </Button>
            </div>
            <div className="p-1.5">
              <Button variant="primary" size="sm" className="w-full" onClick={() => { fileRef.current?.click(); setPdfBlobUrl(null); setMessages([]); navigate('/pdf', { replace: true }); setShowPdfList(false) }}>
                <Upload className="size-3.5" />
                Upload PDF
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5">
              {pdfConversations.map(c => (
                <button type="button"
                  key={c.id}
                  onClick={() => { navigate(`/pdf/${c.id}`); setShowPdfList(false) }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-[2px] text-[13px] text-left group ${
                    c.id === id ? 'bg-accent-muted text-accent' : 'text-base-500 hover:bg-base-800 hover:text-base-300'
                  }`}
                >
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate flex-1">{truncate(c.title || 'Untitled', 24)}</span>
                  <span className="text-[12px] text-base-600 shrink-0 font-mono">{formatRelativeTime(c.createdAt)}</span>
                </button>
              ))}
              {pdfConversations.length === 0 && (
                <p className="text-[13px] text-base-600 text-center py-6">No documents yet</p>
              )}
            </div>
          </div>
        </>
      )}
      <div className="pdf-split flex-1 flex relative">
        <div className="overflow-hidden border-r border-base-800 flex flex-col" style={{ width: `${splitPos}%` }}>
              <div className="h-[37px] border-b border-base-800 bg-surface flex items-center px-3 gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setShowPdfList(true)} className="md:hidden px-2 -ml-1">
                  <FileText className="size-3.5" />
                </Button>
                <FileText className="size-3.5 text-base-500 hidden md:block" />
            <span className="text-[11px] text-base-400 font-medium font-mono">
              {(id && !file) ? (docId ? 'Document' : '') : file ? file.name : 'Document Viewer'}
            </span>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {loadingDoc ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="size-5 animate-spin text-base-500 mb-3" />
                <p className="text-[11px] text-base-500 font-mono">Loading document...</p>
              </div>
            ) : !file && !pdfBlobUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center p-3">
                <FileText className="size-10 text-base-700 mb-3" />
                <p className="text-[11px] text-base-500 mb-3 font-mono">Upload a PDF to begin</p>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="size-3.5" />
                    Upload PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowPdfList(true)} className="md:hidden">
                    <FileText className="size-3.5" />
                    Documents
                  </Button>
                  {!showPdfList && (
                    <Button variant="ghost" size="sm" onClick={() => setShowPdfList(true)} className="hidden md:inline-flex">
                      Show List
                    </Button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : uploading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="size-5 animate-spin text-base-500 mb-3" />
                <p className="text-[11px] text-base-500 font-mono">Processing document...</p>
              </div>
            ) : uploadError ? (
              <div className="flex-1 text-[11px] text-red-400 leading-relaxed p-3 rounded-[4px] border border-red-500/20 bg-red-500/5 m-3">
                <p className="font-medium mb-1">Upload failed</p>
                <p className="font-mono">{uploadError}</p>
                <Button variant="ghost" size="sm" className="mt-2 text-red-400" onClick={() => { setFile(null); setUploadError(null); navigate('/pdf', { replace: true }) }}>
                  Try again
                </Button>
              </div>
            ) : displayPdfUrl ? (
              <iframe
                src={displayPdfUrl}
                className="flex-1 w-full border-0 bg-white"
                title={file?.name || 'PDF'}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-[11px] text-base-600 font-mono">PDF file unavailable</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-[3px] bg-base-800 hover:bg-accent/50 cursor-col-resize transition-colors shrink-0" onMouseDown={handleMouseDown} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-[37px] border-b border-base-800 bg-surface flex items-center px-3 shrink-0">
            <span className="text-[11px] text-base-400 font-medium font-mono">Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-workspace">
            <div className="p-3 space-y-2 max-w-4xl">
              {messages.map((m, i) => (
                <div key={i} className={`rounded-[4px] ${m.role === 'assistant' ? 'border border-base-800 bg-surface' : 'flex justify-end'}`}>
                  {m.role === 'assistant' ? (
                    <>
                      <div className="h-7 border-b border-base-800 flex items-center px-3">
                        <span className="text-[10px] font-medium text-accent font-mono">PDF Assistant</span>
                      </div>
                      <div className="px-3 py-2 text-[12px] text-base-200">
                        <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    </>
                  ) : (
                    <div className="max-w-[75%] rounded-[4px] bg-accent-muted border border-accent/20 px-3 py-2">
                      <div className="text-[12px] text-base-200">{m.content}</div>
                    </div>
                  )}
                </div>
              ))}
              {messages.length === 0 && !loadingDoc && (
                <p className="text-[11px] text-base-600 text-center py-8 font-mono">Ask a question about your document</p>
              )}
            </div>
          </div>
          <div className="border-t border-base-800 p-2 bg-surface shrink-0">
            <div className="flex gap-2 items-end max-w-4xl mx-auto">
              <div className="flex-1 rounded-[4px] border border-base-700 bg-base-950 px-3 py-2 focus-within:border-accent/40 transition-colors">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Ask about your document..."
                  rows={1}
                  className="w-full bg-transparent text-[12px] text-base-100 placeholder:text-base-600 resize-none outline-none min-h-[20px] leading-relaxed font-mono"
                />
              </div>
              <Button variant="primary" size="icon" onClick={handleSend} disabled={!input.trim() || sending || !docId} className="size-8 shrink-0">
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
