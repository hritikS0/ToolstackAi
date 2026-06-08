const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

export function playNotificationSound() {
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.4)
  } catch {
    // Audio not available
  }
}
