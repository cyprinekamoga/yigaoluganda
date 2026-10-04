/**
 * Tiny sound effects made with the Web Audio API (no files, no speech).
 * Luganda words are NEVER spoken by a computer voice, only by real recordings.
 */
let ctx: AudioContext | null = null

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.05)
}

function ready(): boolean {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return true
  } catch {
    return false
  }
}

export function playCorrect() {
  if (!ready()) return
  tone(660, 0, 0.12, 'triangle')
  tone(990, 0.1, 0.2, 'triangle')
}

/** Soft and low, never a harsh buzzer. */
export function playGentle() {
  if (!ready()) return
  tone(392, 0, 0.18, 'sine', 0.08)
  tone(330, 0.14, 0.22, 'sine', 0.08)
}

export function playFanfare() {
  if (!ready()) return
  ;[523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'))
}
