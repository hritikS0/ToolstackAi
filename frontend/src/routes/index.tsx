import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/app-layout'
import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { DashboardPage } from '@/pages/dashboard'
import { ChatPage } from '@/pages/chat'
import { PdfChatPage } from '@/pages/pdf-chat'
import { ImageAnalyzerPage } from '@/pages/image-analyzer'
import { CodeDebuggerPage } from '@/pages/code-debugger'
import { ConversationsPage } from '@/pages/conversations'
import { SettingsPage } from '@/pages/settings'
import { BrainPage } from '@/pages/brain'
import { MediaPage } from '@/pages/media'

export function AppRoutes() {
  return (
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
        <Route path="/image" element={<ImageAnalyzerPage />} />
        <Route path="/debug" element={<CodeDebuggerPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/brain" element={<BrainPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
