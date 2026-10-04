/**
 * Simple spaced repetition (Leitner boxes).
 * Box 0 = brand new or just missed, box 5 = well known.
 * A correct answer moves a word up one box, but only when the word was due, so answering the
 * same word five times in one lesson doesn't count as five days of practice.
 * A wrong answer sends it back to box 1 and makes it due straight away.
 */

export interface WordMemory {
  box: number
  /** Epoch ms when the word is next due for review. */
  due: number
  correct: number
  wrong: number
  lastSeen: number
}

export type MemoryMap = Record<string, WordMemory>

const DAY = 24 * 60 * 60 * 1000
/** Review interval for each box, in days. */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 8, 16] as const
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1

export function newMemory(now: number): WordMemory {
  return { box: 0, due: now, correct: 0, wrong: 0, lastSeen: now }
}

export function review(memory: WordMemory | undefined, correct: boolean, now: number): WordMemory {
  const m = memory ?? newMemory(now)
  if (correct && m.due > now) return { ...m, correct: m.correct + 1, lastSeen: now }
  const box = correct ? Math.min(m.box + 1, MAX_BOX) : 1
  // A missed word is due again straight away (it should come back in the next practice).
  const due = correct ? now + BOX_INTERVAL_DAYS[box] * DAY : now
  return {
    box,
    due,
    correct: m.correct + (correct ? 1 : 0),
    wrong: m.wrong + (correct ? 0 : 1),
    lastSeen: now,
  }
}

/** Lower is weaker. Used to sort practice words. */
export function strength(m: WordMemory): number {
  const attempts = m.correct + m.wrong
  const accuracy = attempts ? m.correct / attempts : 0
  return m.box + accuracy
}

/**
 * Pick words for a practice round: words that are due first (weakest first),
 * then the weakest of the rest. Only words the child has met are used.
 */
export function pickPracticeWords(memory: MemoryMap, now: number, count = 6): string[] {
  const entries = Object.entries(memory)
  const byWeakness = (a: [string, WordMemory], b: [string, WordMemory]) =>
    strength(a[1]) - strength(b[1]) || a[1].lastSeen - b[1].lastSeen
  const due = entries.filter(([, m]) => m.due <= now).sort(byWeakness)
  const notDue = entries.filter(([, m]) => m.due > now).sort(byWeakness)
  return [...due, ...notDue].slice(0, count).map(([id]) => id)
}

export function countDue(memory: MemoryMap, now: number): number {
  return Object.values(memory).filter((m) => m.due <= now).length
}

/** Words the child has answered right at least once since they last missed them. */
export function countLearned(memory: MemoryMap): number {
  return Object.values(memory).filter((m) => m.box >= 1 && m.correct > 0).length
}
