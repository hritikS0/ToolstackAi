import apiClient from '@/api/client'
import { config } from '@/config'
import type { Conversation, Message } from '@/types/api'

interface VisionResponse {
  success: boolean
  data?: { answer: string; memorySaved?: number }
}

export const chatService = {
  async getConversations(limit?: number, offset?: number) {
    const params = new URLSearchParams()
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await apiClient.get<{ success: boolean; data: Conversation[]; total: number; hasMore: boolean }>(`/chat/conversations${query}`)
    return res.data
  },
  async createConversation(data?: { title?: string }) {
    const res = await apiClient.post<{ success: boolean; data: { conversation: Conversation } }>('/chat/conversations', data || {})
    return res.data
  },
  async deleteConversation(id: string) {
    await apiClient.delete(`/chat/conversations/${id}`)
  },
  async deleteAllConversations() {
    const res = await apiClient.delete<{ success: boolean; message: string; deleted: number }>('/chat/conversations')
    return res.data
  },
  async updateConversation(id: string, data: { title?: string; settings?: any }) {
    const res = await apiClient.patch<{ success: boolean; data: Conversation }>(`/chat/conversations/${id}`, data)
    return res.data
  },
  async getMessages(conversationId: string) {
    const res = await apiClient.get<{ success: boolean; data: Message[] }>(`/chat/message?conversationId=${conversationId}`)
    return res.data
  },
  async visionChat(data: { message: string; conversationId: string; image: File }) {
    const form = new FormData()
    form.append('image', data.image)
    form.append('message', data.message)
    form.append('conversationId', data.conversationId)
    const res = await apiClient.post<VisionResponse>('/chat/vision', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    })
    return res.data
  },
  async streamChat(
    data: { message: string; conversationId: string; tools?: { webSearch: boolean } },
    onChunk: (chunk: string) => void,
    onMemory?: (saved: number) => void,
    onSources?: (sources: { title: string; url: string; description?: string }[]) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const token = localStorage.getItem(config.auth.tokenKey)
    const response = await fetch(`${config.api.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal,
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6)
          if (payload === '[DONE]') return
          try {
            const parsed = JSON.parse(payload)
            if (parsed.type === 'sources') {
              if (onSources && parsed.sources) {
                onSources(parsed.sources)
              }
              continue
            }
            if (parsed.type === 'brain') {
              if (onMemory && parsed.saved > 0) onMemory(parsed.saved)
              continue
            }
            if (parsed.content) onChunk(parsed.content)
          } catch {
            /* skip malformed chunk */
          }
        }
      }
    }
  },
}
