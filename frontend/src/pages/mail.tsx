import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mailService, type EmailThread } from '@/services/mail.service'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  Mail, RefreshCw, Plus, Sparkles, Send, Tag, AlertCircle,
  Clock, CheckCircle, ShieldAlert, FileText, Settings, Trash2,
  ChevronRight, ArrowRight, UserCheck, Wand2, Inbox
} from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'All Messages', icon: Inbox },
  { id: 'action_required', label: 'Action Required', icon: AlertCircle, color: 'text-amber-400 bg-amber-400/10' },
  { id: 'primary', label: 'Primary', icon: Mail, color: 'text-emerald-400 bg-emerald-400/10' },
  { id: 'updates', label: 'Updates', icon: Clock, color: 'text-blue-400 bg-blue-400/10' },
  { id: 'finance', label: 'Finance & Receipts', icon: Tag, color: 'text-purple-400 bg-purple-400/10' },
  { id: 'newsletter', label: 'Newsletters', icon: FileText, color: 'text-cyan-400 bg-cyan-400/10' },
  { id: 'spam', label: 'Spam & Promos', icon: ShieldAlert, color: 'text-rose-400 bg-rose-400/10' },
]

export function MailPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showComposer, setShowComposer] = useState(false)

  // Account Modal Form State
  const [accountForm, setAccountForm] = useState({
    email: '',
    displayName: '',
    provider: 'gmail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    username: '',
    password: '',
  })
  const [testingConnection, setTestingConnection] = useState(false)

  // AI Draft Generator State
  const [draftPreset, setDraftPreset] = useState<'quick_reply' | 'formal' | 'polite_decline' | 'follow_up' | 'detailed'>('formal')
  const [draftTone, setDraftTone] = useState<'professional' | 'casual' | 'direct' | 'warm' | 'persuasive'>('professional')
  const [userInstruction, setUserInstruction] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [composedText, setComposedText] = useState('')

  // 1. Fetch Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['mail-accounts'],
    queryFn: () => mailService.getAccounts(),
  })
  const accounts = accountsData?.accounts || []

  // 2. Fetch Threads
  const { data: threadsData, isLoading: loadingThreads } = useQuery({
    queryKey: ['mail-threads', selectedCategory, searchQuery],
    queryFn: () => mailService.getThreads({ category: selectedCategory, search: searchQuery }),
  })
  const threads = threadsData?.threads || []

  // 3. Fetch Selected Thread Details
  const { data: threadDetailsData, isLoading: loadingThreadDetails } = useQuery({
    queryKey: ['mail-thread-details', selectedThreadId],
    queryFn: () => (selectedThreadId ? mailService.getThreadDetails(selectedThreadId) : null),
    enabled: !!selectedThreadId,
  })
  const currentThread = threadDetailsData?.thread

  // Mutations
  const categorizeAllMutation = useMutation({
    mutationFn: () => mailService.categorizeAll(),
    onSuccess: (data) => {
      addToast(`Categorized ${data.categorizedCount} email thread(s)!`)
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
      queryClient.invalidateQueries({ queryKey: ['mail-thread-details', selectedThreadId] })
    },
    onError: (err: any) => addToast(err.message || 'Failed to auto-categorize emails'),
  })

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => mailService.syncAccount(accountId),
    onSuccess: (data) => {
      addToast(`Synced ${data.syncedCount} new email(s)!`)
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
      if (data.syncedCount > 0) {
        categorizeAllMutation.mutate()
      }
    },
    onError: (err: any) => addToast(err.message || 'Sync failed'),
  })

  const categorizeMutation = useMutation({
    mutationFn: (threadId: string) => mailService.categorizeThread(threadId),
    onSuccess: () => {
      addToast('AI categorization complete!')
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
      queryClient.invalidateQueries({ queryKey: ['mail-thread-details', selectedThreadId] })
    },
  })

  const generateDraftMutation = useMutation({
    mutationFn: (threadId: string) =>
      mailService.generateDraft({
        threadId,
        preset: draftPreset,
        tone: draftTone,
        userInstruction,
        includeWorkspaceContext: includeContext,
      }),
    onSuccess: (res) => {
      setComposedText(res.draft.draftBody)
      addToast('AI Draft generated!')
    },
    onError: (err: any) => addToast(err.message || 'Failed to generate AI draft'),
  })

  const sendEmailMutation = useMutation({
    mutationFn: (data: { accountId: string; to: string[]; subject: string; bodyText: string; threadId?: string }) =>
      mailService.sendEmail(data),
    onSuccess: () => {
      addToast('Email sent successfully!')
      setComposedText('')
      setShowComposer(false)
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
      queryClient.invalidateQueries({ queryKey: ['mail-thread-details', selectedThreadId] })
    },
    onError: (err: any) => addToast(err.message || 'Failed to send email'),
  })

  const addAccountMutation = useMutation({
    mutationFn: (data: typeof accountForm) => mailService.createAccount(data),
    onSuccess: () => {
      addToast('Email account added!')
      setShowAccountModal(false)
      queryClient.invalidateQueries({ queryKey: ['mail-accounts'] })
    },
    onError: (err: any) => addToast(err.message || 'Failed to add account'),
  })

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => mailService.deleteAccount(id),
    onSuccess: () => {
      addToast('Account removed')
      queryClient.invalidateQueries({ queryKey: ['mail-accounts'] })
    },
  })

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await mailService.testConnection(accountForm)
      if (res.success) {
        addToast('IMAP Connection Successful!')
      } else {
        addToast(res.message || 'Connection failed')
      }
    } catch (err: any) {
      addToast(err.message || 'Connection failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleProviderSelect = (prov: string) => {
    if (prov === 'gmail') {
      setAccountForm((prev) => ({
        ...prev,
        provider: 'gmail',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
      }))
    } else if (prov === 'outlook') {
      setAccountForm((prev) => ({
        ...prev,
        provider: 'outlook',
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
      }))
    } else {
      setAccountForm((prev) => ({ ...prev, provider: 'imap' }))
    }
  }

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-workspace text-base-100 font-mono text-xs">
      {/* 1. Left Nav Sidebar: Categories & Accounts */}
      <div className="w-full md:w-56 border-r border-sidebar-border bg-sidebar shrink-0 flex flex-col p-3 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent font-semibold tracking-wider uppercase text-sm">
            <Mail className="size-4" />
            <span>AI Mail Center</span>
          </div>
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => syncMutation.mutate(accounts[0].id)}
              disabled={syncMutation.isPending}
              className="p-1.5 rounded hover:bg-base-800 text-base-400 hover:text-accent transition-colors"
              title="Sync Inbox"
            >
              <RefreshCw className={cn('size-3.5', syncMutation.isPending && 'animate-spin')} />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-1 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-base-500 tracking-wider px-2 mb-1">Folders & Categories</div>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] font-mono transition-all',
                  active ? 'bg-accent-muted text-accent font-medium' : 'text-base-400 hover:bg-base-800/40 hover:text-base-200'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className={cn('size-3.5', cat.color ? cat.color.split(' ')[0] : 'text-base-400')} />
                  <span className="truncate">{cat.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Account Manager */}
        <div className="border-t border-sidebar-border pt-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-base-500 px-1">
            <span>Accounts</span>
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="text-accent hover:underline flex items-center gap-1"
            >
              <Plus className="size-3" /> Add
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="p-2.5 rounded bg-base-900 border border-base-800 text-center text-base-500">
              No accounts connected.
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                className="mt-2 w-full py-1 bg-accent text-base-950 font-bold rounded text-[11px] hover:brightness-110"
              >
                Connect Email
              </button>
            </div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-2 rounded bg-base-900/60 border border-base-850">
                <div className="truncate">
                  <div className="font-semibold text-base-200 truncate">{acc.displayName || acc.email}</div>
                  <div className="text-[10px] text-base-500 truncate">{acc.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAccountMutation.mutate(acc.id)}
                  className="text-base-500 hover:text-rose-400 p-1"
                  title="Remove account"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Middle Column: Thread List */}
      <div className="w-full md:w-80 border-r border-sidebar-border bg-workspace flex flex-col shrink-0">
        <div className="p-3 border-b border-sidebar-border space-y-2">
          <input
            type="text"
            placeholder="Search email threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-base-900 border border-base-800 text-base-200 placeholder:text-base-500 focus:outline-none focus:border-accent"
          />

          <button
            type="button"
            onClick={() => categorizeAllMutation.mutate()}
            disabled={categorizeAllMutation.isPending || threads.length === 0}
            className="w-full py-1 rounded bg-accent/10 border border-accent/30 text-accent font-semibold flex items-center justify-center gap-1.5 hover:bg-accent/20 disabled:opacity-50"
          >
            <Sparkles className={cn('size-3.5', categorizeAllMutation.isPending && 'animate-spin')} />
            <span>{categorizeAllMutation.isPending ? 'Auto-Categorizing Inbox...' : 'Auto-Categorize All Mails'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-base-850/40">
          {loadingThreads ? (
            <div className="p-6 text-center text-base-500 flex items-center justify-center gap-2">
              <RefreshCw className="size-4 animate-spin text-accent" /> Loading messages...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-base-500 space-y-2">
              <Mail className="size-8 mx-auto text-base-600" />
              <div>No email threads found.</div>
              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => syncMutation.mutate(accounts[0].id)}
                  className="px-3 py-1 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/20"
                >
                  Sync Inbox Now
                </button>
              )}
            </div>
          ) : (
            threads.map((thread) => {
              const selected = selectedThreadId === thread.id
              const catObj = CATEGORIES.find((c) => c.id === thread.category)
              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={cn(
                    'p-3 cursor-pointer transition-colors space-y-1.5',
                    selected ? 'bg-accent-muted/40 border-l-2 border-accent' : 'hover:bg-base-900/50',
                    !thread.isRead && 'font-bold'
                  )}
                >
                  <div className="flex items-center justify-between text-base-400 text-[10px]">
                    <span className="truncate max-w-[140px] text-base-300">
                      {thread.messages[0]?.fromName || thread.messages[0]?.fromAddress || 'Unknown'}
                    </span>
                    <span>{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
                  </div>

                  <div className="text-base-100 font-medium truncate text-[11px]">{thread.subject}</div>

                  <div className="text-base-400 text-[10px] line-clamp-2 leading-relaxed">{thread.snippet}</div>

                  <div className="flex items-center justify-between pt-1">
                    {catObj && (
                      <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase', catObj.color)}>
                        {catObj.label}
                      </span>
                    )}

                    {thread.urgency > 2 && (
                      <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                        <AlertCircle className="size-2.5" /> High Priority
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 3. Right Column: Main Thread View & AI Composer */}
      <div className="flex-1 flex flex-col bg-workspace overflow-hidden">
        {!selectedThreadId || !currentThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-base-500 p-8 space-y-3">
            <Mail className="size-12 text-base-700" />
            <div className="text-sm font-semibold text-base-400">Select an email thread to view details</div>
            <p className="text-center max-w-sm text-base-500">
              View full conversations, auto-generate AI summaries, and compose smart replies with custom tones & formatting.
            </p>
          </div>
        ) : loadingThreadDetails ? (
          <div className="flex-1 flex items-center justify-center text-base-500">
            <RefreshCw className="size-5 animate-spin text-accent mr-2" /> Loading thread details...
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Toolbar */}
            <div className="p-4 border-b border-sidebar-border bg-sidebar flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-base-100">{currentThread.subject}</h2>
                <div className="text-[10px] text-base-400 flex items-center gap-2 mt-0.5">
                  <span>Account: {currentThread.account.email}</span>
                  <span>•</span>
                  <span>{currentThread.messages.length} message(s)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => categorizeMutation.mutate(currentThread.id)}
                  disabled={categorizeMutation.isPending}
                  className="px-2.5 py-1 rounded bg-accent/10 border border-accent/30 text-accent font-semibold flex items-center gap-1.5 hover:bg-accent/20"
                >
                  <Sparkles className={cn('size-3.5', categorizeMutation.isPending && 'animate-spin')} />
                  <span>AI Categorize & Summarize</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowComposer((c) => !c)}
                  className="px-3 py-1 rounded bg-accent text-base-950 font-bold flex items-center gap-1.5 hover:brightness-110"
                >
                  <Wand2 className="size-3.5" />
                  <span>AI Reply Composer</span>
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* AI Executive Summary Card */}
              {currentThread.aiSummary && (
                <div className="p-3.5 rounded-lg bg-gradient-to-r from-accent-muted/30 via-base-900 to-base-900 border border-accent/30 space-y-2">
                  <div className="flex items-center justify-between text-accent font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> AI Thread Summary
                    </span>
                    <span className="uppercase tracking-widest text-[9px] bg-accent/20 px-2 py-0.5 rounded">
                      Category: {currentThread.category}
                    </span>
                  </div>
                  <p className="text-base-200 leading-relaxed text-[11px] font-sans">{currentThread.aiSummary}</p>

                  {Array.isArray(currentThread.actionItems) && currentThread.actionItems.length > 0 && (
                    <div className="pt-2 border-t border-base-800/60 space-y-1">
                      <div className="text-[10px] font-bold text-amber-400">Extracted Action Items:</div>
                      {currentThread.actionItems.map((item: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-base-300 text-[10px]">
                          <CheckCircle className="size-3 text-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Chain */}
              <div className="space-y-4">
                {currentThread.messages.map((msg) => (
                  <div key={msg.id} className="p-4 rounded-lg bg-base-900/60 border border-base-850 space-y-3">
                    <div className="flex items-center justify-between border-b border-base-800/50 pb-2">
                      <div>
                        <div className="font-semibold text-base-100">{msg.fromName || msg.fromAddress}</div>
                        <div className="text-[10px] text-base-500">To: {msg.toAddresses.join(', ')}</div>
                      </div>
                      <div className="text-[10px] text-base-500">{new Date(msg.sentAt).toLocaleString()}</div>
                    </div>

                    {msg.bodyHtml ? (
                      <div
                        className="text-base-300 leading-relaxed prose prose-invert max-w-none text-xs"
                        dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                      />
                    ) : (
                      <div className="text-base-300 leading-relaxed whitespace-pre-wrap font-sans text-xs">{msg.bodyText}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI Draft & Composer Drawer / Box */}
              {showComposer && (
                <div className="p-4 rounded-lg bg-base-900 border border-accent/40 space-y-3">
                  <div className="flex items-center justify-between text-accent font-bold">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Wand2 className="size-4" /> AI Contextual Draft Assistant
                    </span>
                    <button type="button" onClick={() => setShowComposer(false)} className="text-base-500 hover:text-base-200">
                      ✕
                    </button>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-base-400 font-bold block mb-1">Preset Strategy</label>
                      <select
                        value={draftPreset}
                        onChange={(e: any) => setDraftPreset(e.target.value)}
                        className="w-full p-1.5 rounded bg-base-950 border border-base-800 text-base-200"
                      >
                        <option value="formal">Formal Response</option>
                        <option value="quick_reply">Quick Acknowledge</option>
                        <option value="polite_decline">Polite Decline</option>
                        <option value="follow_up">Follow-Up Request</option>
                        <option value="detailed">Detailed Answer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-base-400 font-bold block mb-1">Tone Selector</label>
                      <select
                        value={draftTone}
                        onChange={(e: any) => setDraftTone(e.target.value)}
                        className="w-full p-1.5 rounded bg-base-950 border border-base-800 text-base-200"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual & Friendly</option>
                        <option value="direct">Direct & Concise</option>
                        <option value="warm">Warm & Empathetic</option>
                        <option value="persuasive">Persuasive</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="ctxCheck"
                        checked={includeContext}
                        onChange={(e) => setIncludeContext(e.target.checked)}
                        className="accent-accent"
                      />
                      <label htmlFor="ctxCheck" className="text-[10px] text-base-300 cursor-pointer">
                        Inject Toolstack Context (Notes/Tasks)
                      </label>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Custom instructions (e.g. 'Tell them I will finish by Friday')..."
                      value={userInstruction}
                      onChange={(e) => setUserInstruction(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-base-950 border border-base-800 text-base-200 placeholder:text-base-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => generateDraftMutation.mutate(currentThread.id)}
                    disabled={generateDraftMutation.isPending}
                    className="w-full py-1.5 rounded bg-accent/20 border border-accent/40 text-accent font-bold flex items-center justify-center gap-2 hover:bg-accent/30"
                  >
                    <Sparkles className={cn('size-4', generateDraftMutation.isPending && 'animate-spin')} />
                    <span>{generateDraftMutation.isPending ? 'Generating AI Response...' : 'Generate AI Draft'}</span>
                  </button>

                  {/* Draft Editor Textarea */}
                  <div>
                    <textarea
                      rows={6}
                      value={composedText}
                      onChange={(e) => setComposedText(e.target.value)}
                      placeholder="AI generated draft will appear here..."
                      className="w-full p-3 rounded bg-base-950 border border-base-800 text-base-100 font-sans text-xs leading-relaxed focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        sendEmailMutation.mutate({
                          accountId: currentThread.accountId,
                          to: [currentThread.messages[currentThread.messages.length - 1].fromAddress],
                          subject: currentThread.subject.startsWith('Re:') ? currentThread.subject : `Re: ${currentThread.subject}`,
                          bodyText: composedText,
                          threadId: currentThread.id,
                        })
                      }
                      disabled={sendEmailMutation.isPending || !composedText.trim()}
                      className="px-4 py-1.5 rounded bg-accent text-base-950 font-bold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50"
                    >
                      <Send className="size-3.5" />
                      <span>{sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Account Connection Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-sidebar border border-sidebar-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-sidebar-border pb-3">
              <h3 className="font-bold text-sm text-base-100 flex items-center gap-2">
                <Mail className="size-4 text-accent" /> Connect Email Account
              </h3>
              <button type="button" onClick={() => setShowAccountModal(false)} className="text-base-500 hover:text-base-200">
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleProviderSelect('gmail')}
                className={cn('flex-1 py-1.5 rounded font-bold border text-[11px]', accountForm.provider === 'gmail' ? 'bg-accent/20 border-accent text-accent' : 'bg-base-900 border-base-800 text-base-400')}
              >
                Gmail
              </button>
              <button
                type="button"
                onClick={() => handleProviderSelect('outlook')}
                className={cn('flex-1 py-1.5 rounded font-bold border text-[11px]', accountForm.provider === 'outlook' ? 'bg-accent/20 border-accent text-accent' : 'bg-base-900 border-base-800 text-base-400')}
              >
                Outlook
              </button>
              <button
                type="button"
                onClick={() => handleProviderSelect('imap')}
                className={cn('flex-1 py-1.5 rounded font-bold border text-[11px]', accountForm.provider === 'imap' ? 'bg-accent/20 border-accent text-accent' : 'bg-base-900 border-base-800 text-base-400')}
              >
                Custom IMAP
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-base-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-base-900 border border-base-800 text-base-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-base-400 block mb-1">Password or App Password</label>
                <input
                  type="password"
                  placeholder="App password or passcode"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-base-900 border border-base-800 text-base-200"
                />
                {accountForm.provider === 'gmail' && (
                  <div className="text-[9px] text-base-500 mt-1">
                    * For Gmail, use a 16-character <strong>App Password</strong> from Google Account Security.
                  </div>
                )}
              </div>

              {accountForm.provider === 'imap' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-base-400 block mb-1">IMAP Host</label>
                    <input
                      type="text"
                      value={accountForm.imapHost}
                      onChange={(e) => setAccountForm({ ...accountForm, imapHost: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-base-900 border border-base-800 text-base-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-base-400 block mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={accountForm.smtpHost}
                      onChange={(e) => setAccountForm({ ...accountForm, smtpHost: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-base-900 border border-base-800 text-base-200"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !accountForm.email || !accountForm.password}
                className="px-3 py-1.5 rounded bg-base-800 text-base-200 hover:bg-base-700 text-[11px]"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                type="button"
                onClick={() => addAccountMutation.mutate(accountForm)}
                disabled={addAccountMutation.isPending || !accountForm.email || !accountForm.password}
                className="px-4 py-1.5 rounded bg-accent text-base-950 font-bold hover:brightness-110 text-[11px]"
              >
                {addAccountMutation.isPending ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
