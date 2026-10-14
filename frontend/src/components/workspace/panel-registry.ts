import { lazy, type ComponentType } from 'react'
import {
  MessageSquare,
  CheckSquare,
  StickyNote,
  Flame,
  FolderOpen,
  Mail,
  Trophy,
  Images,
  BrainCircuit,
  History,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

export type ToolId =
  | 'chat'
  | 'tasks'
  | 'notes'
  | 'habits'
  | 'projects'
  | 'mail'
  | 'goals'
  | 'media'
  | 'brain'
  | 'conversations'
  | 'settings'
  | 'dashboard'

export interface ToolMeta {
  id: ToolId
  label: string
  path: string
  icon: LucideIcon
  description: string
  Component: ComponentType<any>
}

export const TOOLS: Record<ToolId, Omit<ToolMeta, 'Component'> & { Component: ComponentType<any> }> = {
  chat: {
    id: 'chat',
    label: 'Chat',
    path: '/chat',
    icon: MessageSquare,
    description: 'AI assistant chat and multi-turn reasoning',
    Component: lazy(() => import('@/pages/chat').then(m => ({ default: m.ChatPage }))),
  },
  tasks: {
    id: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
    description: 'Track priorities, deadlines, and task progress',
    Component: lazy(() => import('@/pages/tasks').then(m => ({ default: m.TasksPage }))),
  },
  notes: {
    id: 'notes',
    label: 'Notes',
    path: '/notes',
    icon: StickyNote,
    description: 'Markdown knowledge base and scratchpad',
    Component: lazy(() => import('@/pages/notes').then(m => ({ default: m.NotesPage }))),
  },
  habits: {
    id: 'habits',
    label: 'Habits',
    path: '/habits',
    icon: Flame,
    description: 'Daily consistency and streak tracking',
    Component: lazy(() => import('@/pages/habits').then(m => ({ default: m.HabitsPage }))),
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: FolderOpen,
    description: 'Milestones, repos, and project deliverables',
    Component: lazy(() => import('@/pages/projects').then(m => ({ default: m.ProjectsPage }))),
  },
  mail: {
    id: 'mail',
    label: 'Mail',
    path: '/mail',
    icon: Mail,
    description: 'Smart inbox, drafts, and messaging',
    Component: lazy(() => import('@/pages/mail').then(m => ({ default: m.MailPage }))),
  },
  goals: {
    id: 'goals',
    label: 'Goals',
    path: '/goals',
    icon: Trophy,
    description: 'Long-term targets and milestone roadmaps',
    Component: lazy(() => import('@/pages/goals').then(m => ({ default: m.GoalsPage }))),
  },
  media: {
    id: 'media',
    label: 'Media',
    path: '/media',
    icon: Images,
    description: 'Generated imagery, diagrams, and assets',
    Component: lazy(() => import('@/pages/media').then(m => ({ default: m.MediaPage }))),
  },
  brain: {
    id: 'brain',
    label: 'Brain',
    path: '/brain',
    icon: BrainCircuit,
    description: 'Vector memories, semantic links, and insights',
    Component: lazy(() => import('@/pages/brain').then(m => ({ default: m.BrainPage }))),
  },
  conversations: {
    id: 'conversations',
    label: 'History',
    path: '/conversations',
    icon: History,
    description: 'Archive of past chats and transcripts',
    Component: lazy(() => import('@/pages/conversations').then(m => ({ default: m.ConversationsPage }))),
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'API keys, system preferences, and theme settings',
    Component: lazy(() => import('@/pages/settings').then(m => ({ default: m.SettingsPage }))),
  },
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview of all active tools and stats',
    Component: lazy(() => import('@/pages/dashboard').then(m => ({ default: m.DashboardPage }))),
  },
}

export function pathToToolId(path: string): ToolId {
  const segment = path.split('/').filter(Boolean)[0] || 'dashboard'
  if (segment in TOOLS) {
    return segment as ToolId
  }
  return 'dashboard'
}

