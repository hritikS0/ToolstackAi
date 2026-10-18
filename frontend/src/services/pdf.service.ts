import apiClient from '@/api/client'
import { config } from '@/config'
import type { PdfUploadResponse, PdfChatResponse } from '@/types/api'

function getPdfFileUrl(documentId: string): string {
  return `${apiClient.defaults.baseURL || ''}/pdf/${documentId}/file`
}

export const pdfService = {
  async uploadPdf(file: File, conversationId?: string, message?: string, signal?: AbortSignal) {
    const form = new FormData()
    form.append('file', file)
    if (conversationId) form.append('conversationId', conversationId)
    if (message) form.append('message', message)
    const res = await apiClient.post<{ success: boolean; data: PdfUploadResponse }>('/pdf/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: config.uploads.pdfTimeout,
      signal,
    })
    return res.data
  },
  async chat(data: { message: string; documentId: string }, signal?: AbortSignal) {
    const res = await apiClient.post<{ success: boolean; data: PdfChatResponse }>('/pdf/chat', data, { signal })
    return res.data
  },
  getPdfFileUrl,
}
