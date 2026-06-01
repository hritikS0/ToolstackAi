import apiClient from '@/api/client'
import { config } from '@/config'
import type { PdfUploadResponse, PdfChatResponse } from '@/types/api'

function getPdfFileUrl(documentId: string): string {
  return `${apiClient.defaults.baseURL || ''}/pdf/${documentId}/file`
}

export const pdfService = {
  async uploadPdf(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<{ success: boolean; data: PdfUploadResponse }>('/pdf/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: config.uploads.pdfTimeout,
    })
    return res.data
  },
  async chat(data: { message: string; documentId: string }) {
    const res = await apiClient.post<{ success: boolean; data: PdfChatResponse }>('/pdf/chat', data)
    return res.data
  },
  getPdfFileUrl,
}
