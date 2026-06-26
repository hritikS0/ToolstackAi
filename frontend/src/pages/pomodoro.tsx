import { useState, useEffect, useRef, useCallback } from 'react'
import { Timer, Play, Pause, RotateCcw, SkipForward, CheckCircle2, Music, ExternalLink, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Mode = 'focus' | 'shortBreak' | 'longBreak'

interface ModeConfig {
  label: string
  duration: number
}

const MODES: Record<Mode, ModeConfig> = {
  focus: { label: 'Focus', duration: 25 },
  shortBreak: { label: 'Short Break', duration: 5 },
  longBreak: { label: 'Long Break', duration: 15 },
}

const PRESETS = [
  { id: 'X4VbdwhkE10', label: 'Lofi Girl' },
  { id: '5qap5aO4i9A', label: 'Chill Beats' },
  { id: 'DWcJFNfaw9c', label: 'Study Radio' },
]

function extractVideoId(input: string): string | null {
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

const RING_RADIUS = 160
const STROKE_WIDTH = 8
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const SVG_SIZE = (RING_RADIUS + STROKE_WIDTH) * 2

const ringColor: Record<Mode, string> = {
  focus: 'stroke-orange-400',
  shortBreak: 'stroke-emerald-400',
  longBreak: 'stroke-blue-400',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* audio not supported */ }
}

export function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('focus')
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [showMusic, setShowMusic] = useState(false)
  const [videoId, setVideoId] = useState('X4VbdwhkE10')
  const [videoInput, setVideoInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const modeRef = useRef(mode)
  const sessionCountRef = useRef(sessionCount)
  const completedRef = useRef(false)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sessionCountRef.current = sessionCount }, [sessionCount])

  useEffect(() => {
    if (!isRunning) return
    completedRef.current = false

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
  }, [timeLeft])

  const handleModeChange = useCallback((newMode: Mode) => {
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration * 60)
  }, [])

  const handleApplyVideo = useCallback(() => {
    const id = extractVideoId(videoInput)
    if (id) {
      setVideoId(id)
      setIframeKey(k => k + 1)
      setVideoInput('')
      setShowInput(false)
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
    setShowInput(true)
  }, [videoId])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const id = extractVideoId(videoInput)
      if (id) {
        setVideoId(id)
        setIframeKey(k => k + 1)
        setVideoInput('')
        setShowInput(false)
      }
    }
    if (e.key === 'Escape') {
      setShowInput(false)
      setVideoInput('')
    }
  }, [videoInput])

  const handleSkip = useCallback(() => {
    setIsRunning(false)
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

  const totalSeconds = MODES[mode].duration * 60
  const progress = timeLeft / totalSeconds
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-base-500" />
            <h1 className="text-base font-medium text-base-100 font-mono">Pomodoro</h1>
            <span className="text-[11px] text-base-600 font-mono">
              ({sessionCount} completed)
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 mb-10 bg-surface border border-base-800 rounded-[4px] p-0.5">
            {(Object.keys(MODES) as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`px-4 py-2 rounded-[2px] text-[12px] font-mono transition-colors ${
                  mode === m
                    ? 'bg-accent-muted text-accent'
                    : 'text-base-500 hover:text-base-300'
                }`}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>

          <div className="relative mb-10">
            <svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              className="-rotate-90"
            >
              <circle
                cx={SVG_SIZE / 2}
                cy={SVG_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={STROKE_WIDTH}
                className="stroke-base-800"
              />
              <circle
                cx={SVG_SIZE / 2}
                cy={SVG_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${ringColor[mode]} transition-[stroke-dashoffset] duration-1000 ease-linear`}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[72px] font-mono font-medium text-base-100 tracking-tighter tabular-nums leading-none">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[11px] text-base-500 font-mono uppercase tracking-wider mt-2">
                {MODES[mode].label}
              </span>
              {mode === 'focus' && (
                <span className="text-[10px] text-base-600 font-mono mt-1">
                  #{sessionCount + 1}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-12">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsRunning(r => !r)}
              className="min-w-[130px] justify-center h-9 text-[12px]"
            >
              {isRunning ? (
                <><Pause className="size-4" /> Pause</>
              ) : (
                <><Play className="size-4" /> Start</>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setIsRunning(false); setTimeLeft(MODES[mode].duration * 60) }} title="Reset" className="size-9">
              <RotateCcw className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSkip} title="Skip" className="size-9">
              <SkipForward className="size-4" />
            </Button>
          </div>
        </div>

        <div className="border-t border-base-800 pt-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="size-4 text-base-500" />
              <span className="text-[11px] font-medium text-base-400 font-mono uppercase tracking-wider">
                Study Music
              </span>
            </div>
            <Button
              variant={showMusic ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowMusic(s => !s)}
              className="h-7"
            >
              {showMusic ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showMusic && (
            <div className="mt-3 rounded-[4px] overflow-hidden border border-base-700">
              <iframe
                key={iframeKey}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&mute=0`}
                className="w-full aspect-video"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Study Music"
              />
              <div className="p-3 bg-surface border-t border-base-700 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-base-600 font-mono tracking-wider mr-1">Presets:</span>
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono transition-colors ${
                        videoId === p.id
                          ? 'bg-accent-muted text-accent'
                          : 'text-base-500 hover:text-base-300 bg-base-900 hover:bg-base-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {showInput ? (
                    <>
                      <input
                        type="text"
                        value={videoInput}
                        onChange={e => setVideoInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Video ID or URL..."
                        className="flex-1 h-7 rounded-[2px] border border-base-700 bg-base-950 px-2 text-[10px] font-mono text-base-200 outline-none focus:border-accent/40"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleApplyVideo}
                        className="size-7 rounded-[2px] flex items-center justify-center text-base-400 hover:text-accent hover:bg-base-800 transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleVideoUrlInput}
                      className="flex items-center gap-1 text-[10px] text-base-500 hover:text-base-300 font-mono transition-colors"
                    >
                      <Pencil className="size-2.5" />
                      Custom URL
                    </button>
                  )}
                  <div className="flex-1" />
                  <a
                    href={`https://www.youtube.com/live/${videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-base-500 hover:text-base-300 font-mono transition-colors"
                  >
                    YouTube <ExternalLink className="size-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-base-800 pt-6">
          <h2 className="text-xs font-medium text-base-400 font-mono uppercase tracking-wider mb-4">
            Today's Progress
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-base-800 rounded-[4px] p-4 text-center">
              <span className="block text-[11px] text-base-500 font-mono uppercase tracking-wider mb-2">Sessions</span>
              <span className="text-2xl font-mono font-medium text-base-100">{sessionCount}</span>
            </div>
            <div className="bg-surface border border-base-800 rounded-[4px] p-4 text-center">
              <span className="block text-[11px] text-base-500 font-mono uppercase tracking-wider mb-2">Focus Time</span>
              <span className="text-2xl font-mono font-medium text-base-100">{sessionCount * 25}m</span>
            </div>
            <div className="bg-surface border border-base-800 rounded-[4px] p-4 text-center">
              <span className="block text-[11px] text-base-500 font-mono uppercase tracking-wider mb-2">Status</span>
              <span className={`text-2xl font-mono font-medium ${isRunning ? 'text-orange-400' : 'text-emerald-400'}`}>
                {isRunning ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {sessionCount > 0 && (
          <div className="mt-6 mb-8">
            <h2 className="text-xs font-medium text-base-400 font-mono uppercase tracking-wider mb-4">
              Session Log
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: sessionCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-surface border border-base-800 rounded-[2px] px-2.5 py-1.5">
                  <CheckCircle2 className={`size-3.5 ${(i + 1) % 4 === 0 ? 'text-blue-400' : 'text-emerald-400'}`} />
                  <span className="text-[11px] font-mono text-base-400">#{(i + 1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
