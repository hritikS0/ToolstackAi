import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/app-layout'
import { Loader2 } from 'lucide-react'

const LandingPage = lazy(() => import('@/pages/landing').then(m => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('@/pages/login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/register').then(m => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard').then(m => ({ default: m.DashboardPage })))
const ChatPage = lazy(() => import('@/pages/chat').then(m => ({ default: m.ChatPage })))
const PdfChatPage = lazy(() => import('@/pages/pdf-chat').then(m => ({ default: m.PdfChatPage })))
// const ImageAnalyzerPage = lazy(() => import('@/pages/image-analyzer').then(m => ({ default: m.ImageAnalyzerPage })))
// const CodeDebuggerPage = lazy(() => import('@/pages/code-debugger').then(m => ({ default: m.CodeDebuggerPage })))
const ConversationsPage = lazy(() => import('@/pages/conversations').then(m => ({ default: m.ConversationsPage })))
const SettingsPage = lazy(() => import('@/pages/settings').then(m => ({ default: m.SettingsPage })))
const BrainPage = lazy(() => import('@/pages/brain').then(m => ({ default: m.BrainPage })))
const GoalsPage = lazy(() => import('@/pages/goals').then(m => ({ default: m.GoalsPage })))
const MediaPage = lazy(() => import('@/pages/media').then(m => ({ default: m.MediaPage })))
const TasksPage = lazy(() => import('@/pages/tasks').then(m => ({ default: m.TasksPage })))
const HabitsPage = lazy(() => import('@/pages/habits').then(m => ({ default: m.HabitsPage })))
const NotesPage = lazy(() => import('@/pages/notes').then(m => ({ default: m.NotesPage })))
const ProjectsPage = lazy(() => import('@/pages/projects').then(m => ({ default: m.ProjectsPage })))

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-workspace">
          <Loader2 className="size-5 animate-spin text-accent" />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
          <Route path="/pdf" element={<PdfChatPage />} />
          <Route path="/pdf/:id" element={<PdfChatPage />} />
          {/* <Route path="/image" element={<ImageAnalyzerPage />} /> */}
          {/* <Route path="/debug" element={<CodeDebuggerPage />} /> */}
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/brain" element={<BrainPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
