import { Timer, Play, Pause, RotateCcw, SkipForward, CheckCircle2, Music, ExternalLink, Pencil, Check, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePomodoro, MODES, PRESETS, RING_RADIUS, STROKE_WIDTH, CIRCUMFERENCE, SVG_SIZE, ringColor, formatTime, formatFocusTime, type Mode } from '@/store/pomodoro'

export function PomodoroPage() {
  const {
    mode, timeLeft, isRunning, sessionCount,
    showMusic, setShowMusic,
    videoId, videoInput, showVideoInput,
    progress,
    sessions, stats,
    handleModeChange, handleSkip, handleReset, toggleRunning,
    handleSelectPreset, handleVideoUrlInput, handleApplyVideo, handleInputKeyDown,
    setVideoInput,
  } = usePomodoro()

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
              onClick={toggleRunning}
              className="min-w-[130px] justify-center h-9 text-[12px]"
            >
              {isRunning ? (
                <><Pause className="size-4" /> Pause</>
              ) : (
                <><Play className="size-4" /> Start</>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset" className="size-9">
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
            <div className="mt-3 rounded-[4px] border border-base-700 bg-surface p-3 space-y-2">
              <span className="text-[10px] text-base-500 font-mono block">
                Music playing in background. Use the widget to stop or open this page for full controls.
              </span>
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
                {showVideoInput ? (
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
          )}
        </div>

        <div className="border-t border-base-800 pt-6">
          <h2 className="text-xs font-medium text-base-400 font-mono uppercase tracking-wider mb-4">
            Today's Progress
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-base-800 rounded-[4px] p-4 text-center">
              <span className="block text-[11px] text-base-500 font-mono uppercase tracking-wider mb-2">Sessions</span>
              <span className="text-2xl font-mono font-medium text-base-100">{stats?.todaySessions ?? 0}</span>
            </div>
            <div className="bg-surface border border-base-800 rounded-[4px] p-4 text-center">
              <span className="block text-[11px] text-base-500 font-mono uppercase tracking-wider mb-2">Focus Time</span>
              <span className="text-2xl font-mono font-medium text-base-100">{formatFocusTime(stats?.todayFocusSeconds ?? 0)}</span>
            </div>
            <div className="bg-surface border border-base-800 rounded-[4px] p-4 text-center">
              <span className="block text-[11px] text-base-500 font-mono uppercase tracking-wider mb-2">Status</span>
              <span className={`text-2xl font-mono font-medium ${isRunning ? 'text-orange-400' : 'text-emerald-400'}`}>
                {isRunning ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="mt-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-base-400 font-mono uppercase tracking-wider">
                Session Log
              </h2>
              <span className="text-[10px] text-base-600 font-mono">
                {stats?.totalSessions ?? sessions.length} sessions · {formatFocusTime(stats?.totalFocusSeconds ?? 0)} total
              </span>
            </div>
            <ul className="space-y-1.5">
              {sessions.map(s => (
                <li key={s.id} className="flex items-center gap-2.5 bg-surface border border-base-800 rounded-[2px] px-3 py-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <History className="size-3 text-base-600 shrink-0" />
                  <span className="flex-1 text-[11px] font-mono text-base-400 truncate">
                    {new Date(s.completedAt).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[11px] font-mono text-base-300">{formatFocusTime(s.durationSeconds)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
