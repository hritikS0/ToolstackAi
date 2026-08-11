import { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, Music, Music2 } from 'lucide-react'
import { pomodoroService } from '@/services/pomodoro.service'
import type { PomodoroSession, PomodoroStats } from '@/types/api'

export type Mode = 'focus' | 'shortBreak' | 'longBreak'

export interface ModeConfig {
  label: string
  duration: number
}

export const MODES: Record<Mode, ModeConfig> = {
  focus: { label: 'Focus', duration: 25 },
  shortBreak: { label: 'Short Break', duration: 5 },
  longBreak: { label: 'Long Break', duration: 15 },
}

export const PRESETS = [
  { id: 'X4VbdwhkE10', label: 'Lofi Girl' },
  { id: '5qap5aO4i9A', label: 'Chill Beats' },
  { id: 'DWcJFNfaw9c', label: 'Study Radio' },
]

export const RING_RADIUS = 160
export const STROKE_WIDTH = 8
export const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
export const SVG_SIZE = (RING_RADIUS + STROKE_WIDTH) * 2

export const ringColor: Record<Mode, string> = {
  focus: 'stroke-orange-400',
  shortBreak: 'stroke-emerald-400',
  longBreak: 'stroke-blue-400',
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatFocusTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const tones = [660, 880, 1100]
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const start = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  } catch { /* audio not supported */ }
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtube.com') || url.hostname === 'youtu.be') {
      if (url.pathname.startsWith('/live/') || url.pathname.startsWith('/watch')) {
        if (url.pathname.startsWith('/live/')) return url.pathname.split('/')[2] || null
        return url.searchParams.get('v')
      }
      if (url.hostname === 'youtu.be') return url.pathname.slice(1)
    }
  } catch { /* invalid URL */ }
  return null
}

export interface CompletionAlert {
  completedMode: Mode
  nextMode: Mode
}

interface PomodoroContextType {
  mode: Mode
  timeLeft: number
  isRunning: boolean
  sessionCount: number
  videoId: string
  videoInput: string
  showVideoInput: boolean
  iframeKey: number
  totalSeconds: number
  progress: number
  showMusic: boolean
  sessions: PomodoroSession[]
  stats: PomodoroStats | null
  completionAlert: CompletionAlert | null
  dismissAlert: () => void
  refreshSessions: () => void
  handleModeChange: (newMode: Mode) => void
  handleSkip: () => void
  handleReset: () => void
  toggleRunning: () => void
  handleSelectPreset: (id: string) => void
  handleVideoUrlInput: () => void
  handleApplyVideo: () => void
  handleInputKeyDown: (e: React.KeyboardEvent) => void
  setVideoInput: (v: string) => void
  setShowMusic: (s: boolean | ((s: boolean) => boolean)) => void
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined)

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('focus')
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [showMusic, setShowMusic] = useState(false)
  const [videoId, setVideoId] = useState('X4VbdwhkE10')
  const [videoInput, setVideoInput] = useState('')
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [stats, setStats] = useState<PomodoroStats | null>(null)
  const [completionAlert, setCompletionAlert] = useState<CompletionAlert | null>(null)

  const modeRef = useRef(mode)
  const sessionCountRef = useRef(sessionCount)
  const completedRef = useRef(false)
  const startedAtRef = useRef<Date | null>(null)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sessionCountRef.current = sessionCount }, [sessionCount])

  const refreshSessions = useCallback(() => {
    pomodoroService.list(100).then(res => setSessions(res.data)).catch(() => {})
    pomodoroService.stats().then(res => setStats(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  useEffect(() => {
    if (!isRunning) return
    completedRef.current = false

    if (modeRef.current === 'focus' && !startedAtRef.current) {
      startedAtRef.current = new Date()
    }

    const id = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning])

  useEffect(() => {
    if (timeLeft !== 0) return
    if (completedRef.current) return
    completedRef.current = true

    playBeep()
    setIsRunning(false)

    const currentMode = modeRef.current
    const currentCount = sessionCountRef.current
    const startedAt = startedAtRef.current
    startedAtRef.current = null

    if (currentMode === 'focus') {
      const newCount = currentCount + 1
      setSessionCount(newCount)
      pomodoroService.create({
        mode: 'focus',
        startedAt: (startedAt ?? new Date()).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: MODES.focus.duration * 60,
      }).then(() => refreshSessions()).catch(() => {})
      const nextMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak'
      setCompletionAlert({ completedMode: 'focus', nextMode })
      if (newCount % 4 === 0) {
        setMode('longBreak')
        setTimeLeft(MODES.longBreak.duration * 60)
      } else {
        setMode('shortBreak')
        setTimeLeft(MODES.shortBreak.duration * 60)
      }
    } else {
      setCompletionAlert({ completedMode: currentMode, nextMode: 'focus' })
      setMode('focus')
      setTimeLeft(MODES.focus.duration * 60)
    }
  }, [timeLeft, refreshSessions])

  const handleModeChange = useCallback((newMode: Mode) => {
    setIsRunning(false)
    startedAtRef.current = null
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration * 60)
  }, [])

  const handleApplyVideo = useCallback(() => {
    const id = extractVideoId(videoInput)
    if (id) {
      setVideoId(id)
      setIframeKey(k => k + 1)
      setVideoInput('')
      setShowVideoInput(false)
    }
  }, [videoInput])

  const handleSelectPreset = useCallback((id: string) => {
    if (id === videoId) {
      setIframeKey(k => k + 1)
    } else {
      setVideoId(id)
      setIframeKey(k => k + 1)
    }
  }, [videoId])

  const handleVideoUrlInput = useCallback(() => {
    setVideoInput(videoId)
    setShowVideoInput(true)
  }, [videoId])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const id = extractVideoId(videoInput)
      if (id) {
        setVideoId(id)
        setIframeKey(k => k + 1)
        setVideoInput('')
        setShowVideoInput(false)
      }
    }
    if (e.key === 'Escape') {
      setShowVideoInput(false)
      setVideoInput('')
    }
  }, [videoInput])

  const handleSkip = useCallback(() => {
    setIsRunning(false)
    startedAtRef.current = null
    const currentMode = modeRef.current
    const currentCount = sessionCountRef.current

    if (currentMode === 'focus') {
      const newCount = currentCount + 1
      setSessionCount(newCount)
      if (newCount % 4 === 0) {
        setMode('longBreak')
        setTimeLeft(MODES.longBreak.duration * 60)
      } else {
        setMode('shortBreak')
        setTimeLeft(MODES.shortBreak.duration * 60)
      }
    } else {
      setMode('focus')
      setTimeLeft(MODES.focus.duration * 60)
    }
  }, [])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    startedAtRef.current = null
    setTimeLeft(MODES[modeRef.current].duration * 60)
  }, [])

  const toggleRunning = useCallback(() => {
    setIsRunning(r => !r)
  }, [])

  const dismissAlert = useCallback(() => {
    setCompletionAlert(null)
  }, [])

  const totalSeconds = MODES[mode].duration * 60
  const progress = timeLeft / totalSeconds

  const value = useMemo(() => ({
    mode, timeLeft, isRunning, sessionCount,
    videoId, videoInput, showVideoInput, iframeKey,
    totalSeconds, progress, showMusic,
    sessions, stats, completionAlert,
    refreshSessions, dismissAlert,
    handleModeChange, handleSkip, handleReset, toggleRunning,
    handleSelectPreset, handleVideoUrlInput, handleApplyVideo, handleInputKeyDown,
    setVideoInput, setShowMusic,
  }), [
    mode, timeLeft, isRunning, sessionCount,
    videoId, videoInput, showVideoInput, iframeKey,
    totalSeconds, progress, showMusic,
    sessions, stats, completionAlert,
    refreshSessions, dismissAlert,
    handleModeChange, handleSkip, handleReset, toggleRunning,
    handleSelectPreset, handleVideoUrlInput, handleApplyVideo, handleInputKeyDown,
  ])

  return (
    <PomodoroContext.Provider value={value}>
      {children}
      {showMusic && (
        <iframe
          key={iframeKey}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&mute=0`}
          className="fixed top-[-9999px] left-[-9999px] w-1 h-1"
          allow="autoplay; encrypted-media"
          title="Study Music"
        />
      )}
      <PomodoroWidget />
      <PomodoroCompletionAlert />
    </PomodoroContext.Provider>
  )
}

export function usePomodoro() {
  const c = useContext(PomodoroContext)
  if (!c) throw new Error('usePomodoro must be used within PomodoroProvider')
  return c
}

function PomodoroWidget() {
  const { timeLeft, isRunning, mode, showMusic, setShowMusic, toggleRunning } = usePomodoro()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed && !isRunning && !showMusic) return null

  const modeDot = {
    focus: 'bg-orange-400',
    shortBreak: 'bg-emerald-400',
    longBreak: 'bg-blue-400',
  }[mode]

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5">
      {dismissed ? (
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="h-8 w-8 rounded-full bg-surface border border-base-700 flex items-center justify-center text-base-400 hover:text-base-200 hover:border-base-600 transition-colors shadow-lg"
          title="Show pomodoro widget"
        >
          <Timer className="size-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-surface border border-base-800 rounded-full h-9 px-3 shadow-lg">
          <button
            type="button"
            onClick={() => navigate('/pomodoro')}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <span className={`size-2 rounded-full ${isRunning ? `${modeDot} animate-pulse` : 'bg-base-600'}`} />
            <span className="text-[12px] font-mono font-medium text-base-200 tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] text-base-500 font-mono uppercase tracking-wider">
              {MODES[mode].label}
            </span>
          </button>
          <span className="w-px h-4 bg-base-700" />
          <button
            type="button"
            onClick={() => toggleRunning()}
            className="size-6 rounded-full flex items-center justify-center text-base-400 hover:text-base-200 hover:bg-base-800 transition-colors"
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? (
              <svg className="size-2.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg className="size-2.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowMusic(s => !s)}
            className={`size-6 rounded-full flex items-center justify-center transition-colors ${showMusic ? 'text-accent bg-accent-muted' : 'text-base-400 hover:text-base-200 hover:bg-base-800'}`}
            title={showMusic ? 'Stop music' : 'Play music'}
          >
            {showMusic ? <Music2 className="size-2.5" /> : <Music className="size-2.5" />}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="size-5 rounded-full flex items-center justify-center text-base-600 hover:text-base-400 transition-colors ml-0.5"
            title="Dismiss"
          >
            <svg className="size-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}

const ALERT_COPY: Record<Mode, { emoji: string; title: string; subtitle: (nextMode: Mode) => string }> = {
  focus: {
    emoji: '🎉',
    title: 'Focus session complete!',
    subtitle: (next) => next === 'longBreak' ? 'Time for a long break — you\'ve earned it.' : 'Time for a short break.',
  },
  shortBreak: {
    emoji: '⚡',
    title: 'Break\'s over!',
    subtitle: () => 'Ready to focus again?',
  },
  longBreak: {
    emoji: '⚡',
    title: 'Long break complete!',
    subtitle: () => 'Ready to jump back into focus?',
  },
}

function PomodoroCompletionAlert() {
  const { completionAlert, dismissAlert, toggleRunning } = usePomodoro()

  if (!completionAlert) return null

  const copy = ALERT_COPY[completionAlert.completedMode]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismissAlert}
      />
      <div className="relative z-10 bg-surface border border-base-700 rounded-[6px] shadow-2xl p-6 w-[320px] flex flex-col items-center gap-3 animate-fade-in">
        <span className="text-4xl leading-none">{copy.emoji}</span>
        <div className="text-center">
          <p className="text-base font-mono font-medium text-base-100">{copy.title}</p>
          <p className="text-[12px] text-base-400 font-mono mt-1">{copy.subtitle(completionAlert.nextMode)}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 w-full">
          <button
            type="button"
            onClick={() => { dismissAlert(); toggleRunning() }}
            className="flex-1 h-8 rounded-[4px] bg-accent text-white text-[12px] font-mono font-medium hover:bg-accent/90 transition-colors"
          >
            Start {MODES[completionAlert.nextMode].label}
          </button>
          <button
            type="button"
            onClick={dismissAlert}
            className="h-8 px-3 rounded-[4px] bg-base-800 text-base-400 text-[12px] font-mono hover:bg-base-700 hover:text-base-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
