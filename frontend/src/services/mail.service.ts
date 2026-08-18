import apiClient from '@/api/client'

export interface EmailAccount {
  id: string
  email: string
  displayName?: string
  provider: string
  imapHost?: string
  imapPort?: number
  smtpHost?: string
  smtpPort?: number
  isDefault: boolean
  lastSyncedAt?: string
  createdAt: string
}

export interface EmailMessage {
  id: string
  threadId: string
  accountId: string
  messageId: string
  fromAddress: string
  fromName?: string
  toAddresses: string[]
  ccAddresses?: string[]
  bccAddresses?: string[]
  subject: string
  bodyText: string
  bodyHtml?: string
  isDraft: boolean
  sentAt: string
}

export interface EmailThread {
  id: string
  accountId: string
  subject: string
  snippet?: string
  category: 'action_required' | 'primary' | 'updates' | 'finance' | 'newsletter' | 'spam'
  urgency: number
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  aiSummary?: string
  actionItems?: string[]
  lastMessageAt: string
  account: {
    id: string
    email: string
    displayName?: string
  }
  messages: EmailMessage[]
}

export const mailService = {
  async getAccounts() {
    const res = await apiClient.get<{ success: boolean; accounts: EmailAccount[] }>('/mail/accounts')
    return res.data
  },

  async createAccount(data: {
    email: string
    displayName?: string
    provider?: string
    imapHost?: string
    imapPort?: number
    smtpHost?: string
    smtpPort?: number
    username?: string
    password?: string
  }) {
    const res = await apiClient.post<{ success: boolean; account: EmailAccount }>('/mail/accounts', data)
    return res.data
  },

  async deleteAccount(id: string) {
    const res = await apiClient.delete<{ success: boolean }>(`/mail/accounts/${id}`)
    return res.data
  },

  async testConnection(data: any) {
    const res = await apiClient.post<{ success: boolean; message: string }>('/mail/accounts/test-connection', data)
    return res.data
  },

  async syncAccount(id: string, limit: number = 20) {
    const res = await apiClient.post<{ success: boolean; syncedCount: number }>(`/mail/accounts/${id}/sync`, { limit })
    return res.data
  },

  async getThreads(params?: { accountId?: string; category?: string; search?: string }) {
    const res = await apiClient.get<{ success: boolean; threads: EmailThread[] }>('/mail/threads', { params })
    return res.data
  },

  async getThreadDetails(id: string) {
    const res = await apiClient.get<{ success: boolean; thread: EmailThread }>(`/mail/threads/${id}`)
    return res.data
  },

  async categorizeThread(id: string) {
    const res = await apiClient.post<{ success: boolean; thread: EmailThread }>(`/mail/threads/${id}/categorize`)
    return res.data
  },

  async categorizeAll() {
    const res = await apiClient.post<{ success: boolean; categorizedCount: number; totalProcessed: number }>('/mail/categorize-all')
    return res.data
  },

  async generateDraft(data: {
    threadId: string
    preset?: 'quick_reply' | 'formal' | 'polite_decline' | 'follow_up' | 'detailed'
    tone?: 'professional' | 'casual' | 'direct' | 'warm' | 'persuasive'
    formatType?: 'bullet_points' | 'formal_letter' | 'concise' | 'detailed'
    userInstruction?: string
    includeWorkspaceContext?: boolean
  }) {
    const res = await apiClient.post<{
      success: boolean
      draft: {
        threadId: string
        to: string[]
        subject: string
        draftBody: string
      }
    }>('/mail/draft', data)
    return res.data
  },

  async sendEmail(data: {
    accountId: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyText: string
    bodyHtml?: string
    threadId?: string
  }) {
    const res = await apiClient.post<{ success: boolean; messageId: string }>('/mail/send', data)
    return res.data
  },
}
