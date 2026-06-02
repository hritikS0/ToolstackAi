export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface User {
  id: string
  email: string
  fullName: string
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
}

export interface Conversation {
  id: string
  title: string | null
  type?: string
  userId: string
  threadId?: string | null
  createdAt: string
}

export interface Project {
  id: string
  userId: string
  name: string
  description: string
  icon: string
  color: string
  threads: Thread[]
  createdAt: string
  updatedAt: string
}

export interface Thread {
  id: string
  userId: string
  projectId: string
  title: string
  description: string
  project?: Project
  conversations: Conversation[]
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface SendMessageRequest {
  message: string
  conversationId: string
}

export interface ImageAnalysisResult {
  summary: string
  detectedObjects: string[]
  issues: string[]
  recommendations: string[]
}

export interface DebugResult {
  summary: string
  bugs: {
    line: number
    severity: 'high' | 'medium' | 'low'
    description: string
    explanation: string
    fix: string
  }[]
  fixes: string[]
  optimizedCode: string
}

export interface PdfUploadResponse {
  documentId: string
  name: string
  chunks: number
}

export interface PdfChatResponse {
  answer: string
}

export interface Memory {
  id: string
  userId: string
  category: string
  title: string
  content: string
  importance: number
  confidence: number
  pinned: boolean
  source?: string
  createdAt: string
  updatedAt: string
}

export interface BrainSettings {
  id: string
  userId: string
  memoryEnabled: boolean
  autoExtract: boolean
  allowUpdates: boolean
  retentionDays: number
  createdAt: string
  updatedAt: string
}

export interface BrainDashboard {
  totalMemories: number
  pinnedMemories: number
  categories: Record<string, number>
  recentActivity: { id: string; title: string; category: string; action: string; timestamp: string }[]
  memoryEnabled: boolean
}

export interface UserApiKey {
  id: string
  provider: string
  maskedKey: string
  isActive: boolean
  createdAt: string
}

export interface ApiKeyTestResult {
  ok: boolean
  message: string
}

export interface DashboardData {
  stats: {
    conversations: number
    chats: number
    pdfs: number
    images: number
    debugSessions: number
    memories: number
  }
  recentConversations: {
    id: string
    title: string
    type: string
    createdAt: string
  }[]
  recentMemories: {
    id: string
    title: string
    category: string
    updatedAt: string
  }[]
  brain: {
    name: string | null
    nameTitle: string | null
    skills: { title: string; content: string; importance: number }[]
    goals: { title: string; content: string; importance: number }[]
    preferences: { title: string; content: string }[]
  }
  projects: {
    id: string
    title: string
    content: string
    importance: number
    updatedAt: string
  }[]
}

export interface MediaItem {
  id: string
  conversationId: string | null
  name: string
  type: string
  fileType: 'image' | 'pdf'
  mimeType: string
  createdAt: string
  url?: string | null
  source: 'chat' | 'upload'
}
