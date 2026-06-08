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
  settings?: any
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  chatMedia?: {
    id: string
    fileName: string
    mimeType: string
    filePath: string
    url?: string | null
  } | null
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

export interface Habit {
  id: string
  userId: string
  projectId?: string | null
  title: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly'
  targetCount?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  completions?: HabitCompletion[]
  todayCompleted?: boolean
  currentStreak?: number
  longestStreak?: number
}

export interface HabitCompletion {
  id: string
  habitId: string
  completedAt: string
  periodStart: string
}

export interface HabitStats {
  habit: Habit
  currentStreak: number
  longestStreak: number
  completionRate: number
  heatmap: { date: string; completed: boolean }[]
}

export interface Goal {
  id: string
  userId: string
  projectId?: string | null
  title: string
  description: string
  targetDate?: string | null
  status: 'active' | 'completed' | 'archived'
  progress: number
  createdAt: string
  updatedAt: string
  milestones?: Milestone[]
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  description: string
  status: 'pending' | 'completed'
  order: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  userId: string
  projectId?: string | null
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface BriefingData {
  greeting: string
  firstName: string
  date: string
  stats: { tasks: number; habits: number; projects: number; goals: number }
  tasks: { open: number; overdue: number; topTasks: { id: string; title: string; priority: string; status: string; dueDate?: string | null }[] }
  habits: { completed: number; total: number; habits: { id: string; title: string; frequency: string; todayCompleted: boolean; currentStreak?: number }[] }
  projects: { active: number; projects: { id: string; name: string; taskCount?: number; color?: string }[] }
  recentActivity: { action: string; title: string; timestamp: string }[]
  aiSuggestion: string | null
}

export interface Task {
  id: string
  userId: string
  projectId?: string | null
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in-progress' | 'done' | 'archived'
  dueDate?: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  userId: string
  name: string
  description: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
  tasks?: Task[]
  goals?: Goal[]
  habits?: Habit[]
  _count?: {
    tasks: number
    goals: number
    habits: number
  }
}

export interface NotificationPreferences {
  id: string
  userId: string
  enabled: boolean
  reminderNotifications: boolean
  taskNotifications: boolean
  goalNotifications: boolean
  habitNotifications: boolean
  browserNotifications: boolean
  dailyBriefingEnabled: boolean
  dailyBriefingTime: string
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  userId: string
  type: 'task' | 'goal' | 'habit' | 'reminder' | 'system'
  title: string
  message: string
  read: boolean
  link?: string | null
  refId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  userId: string
  title: string
  message: string
  remindAt: string
  nextRunAt: string
  frequency: 'once' | 'daily' | 'weekly'
  enabled: boolean
  fired: boolean
  notified: boolean
  log: { timestamp: string; action: string; notificationCreated: boolean; browserNotificationSent: boolean }[]
  createdAt: string
  updatedAt: string
}
