import apiClient from '@/api/client'
import type { PomodoroSession, PomodoroStats } from '@/types/api'

export interface CreatePomodoroSessionData {
  mode: 'focus' | 'shortBreak' | 'longBreak'
  startedAt: string
  completedAt: string
  durationSeconds: number
}

export const pomodoroService = {
  async list(limit?: number) {
    const res = await apiClient.get<{ success: boolean; data: PomodoroSession[] }>('/pomodoro/sessions', {
      params: limit ? { limit } : undefined,
    })
    return res.data
  },

  async create(data: CreatePomodoroSessionData) {
    const res = await apiClient.post<{ success: boolean; data: PomodoroSession }>('/pomodoro/sessions', data)
    return res.data
  },

  async stats() {
    const res = await apiClient.get<{ success: boolean; data: PomodoroStats }>('/pomodoro/stats')
    return res.data
  },
}
