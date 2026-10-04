import type { Exercise } from './generator'

/**
 * The running state of one lesson / practice / story quiz.
 * A missed exercise comes back once at the end, the standard "try again later" pattern.
 */
export interface Session {
  queue: Exercise[]
  index: number
  mistakes: number
  correct: number
  /** Number of exercises in the original plan (used for the progress bar). */
  planned: number
  retried: string[]
}

export function startSession(exercises: Exercise[]): Session {
  return { queue: exercises, index: 0, mistakes: 0, correct: 0, planned: exercises.length, retried: [] }
}

export function current(s: Session): Exercise | undefined {
  return s.queue[s.index]
}

export function isFinished(s: Session): boolean {
  return s.index >= s.queue.length
}

/** Record the answer to the current exercise (does not move on yet). */
export function answer(s: Session, correct: boolean): Session {
  const ex = current(s)
  if (!ex) return s
  if (correct) return { ...s, correct: s.correct + 1 }
  const canRetry = !s.retried.includes(ex.id)
  return {
    ...s,
    mistakes: s.mistakes + 1,
    queue: canRetry ? [...s.queue, { ...ex, id: `${ex.id}-again` }] : s.queue,
    retried: canRetry ? [...s.retried, ex.id] : s.retried,
  }
}

export function next(s: Session): Session {
  return { ...s, index: s.index + 1 }
}

/** 0–1, for the progress bar. A retry adds a step, so the bar may step back slightly. */
export function progress(s: Session): number {
  if (!s.queue.length) return 1
  return Math.min(1, s.index / s.queue.length)
}
