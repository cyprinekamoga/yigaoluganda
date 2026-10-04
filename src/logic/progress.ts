import type { Lang } from '../content/types'
import { review, type MemoryMap } from './srs'

/** Everything the app remembers. Stored only on this device (localStorage). */
export interface ProgressState {
  version: 1
  settings: {
    uiLang: Lang
    /** The language the child learns Luganda from (Swedish → Luganda or English → Luganda). */
    track: Lang
    mascotName: string
    onboarded: boolean
    sound: boolean
  }
  xp: number
  hearts: number
  /** When `hearts` was last recalculated (epoch ms). */
  heartsUpdatedAt: number
  streak: number
  bestStreak: number
  /** Local calendar day (YYYY-MM-DD) of the last finished activity. */
  lastActiveDay: string | null
  completedLessons: Record<string, { at: number; perfect: boolean }>
  completedStories: Record<string, number>
  memory: MemoryMap
  practiceCount: number
  perfectCount: number
  badges: Record<string, number>
}

export const MAX_HEARTS = 5
export const HEART_REFILL_MS = 20 * 60 * 1000

export const XP = {
  correctAnswer: 1,
  lessonComplete: 10,
  perfectBonus: 5,
  practiceComplete: 5,
  storyComplete: 15,
} as const

export const DEFAULT_MASCOT_NAME = 'Ngaali'

export function initialState(now: number, uiLang: Lang = 'sv'): ProgressState {
  return {
    version: 1,
    settings: { uiLang, track: uiLang, mascotName: DEFAULT_MASCOT_NAME, onboarded: false, sound: true },
    xp: 0,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: now,
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    completedLessons: {},
    completedStories: {},
    memory: {},
    practiceCount: 0,
    perfectCount: 0,
    badges: {},
  }
}

// ---------- Hearts ----------

/** Hearts refill one at a time, every HEART_REFILL_MS. */
export function currentHearts(state: Pick<ProgressState, 'hearts' | 'heartsUpdatedAt'>, now: number) {
  if (state.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, heartsUpdatedAt: now }
  const gained = Math.floor(Math.max(0, now - state.heartsUpdatedAt) / HEART_REFILL_MS)
  const hearts = Math.min(MAX_HEARTS, state.hearts + gained)
  // Keep the leftover time so the next heart isn't delayed.
  const heartsUpdatedAt = hearts >= MAX_HEARTS ? now : state.heartsUpdatedAt + gained * HEART_REFILL_MS
  return { hearts, heartsUpdatedAt }
}

/** Milliseconds until the next heart, or 0 when hearts are full. */
export function msUntilNextHeart(state: Pick<ProgressState, 'hearts' | 'heartsUpdatedAt'>, now: number): number {
  const c = currentHearts(state, now)
  if (c.hearts >= MAX_HEARTS) return 0
  return HEART_REFILL_MS - (now - c.heartsUpdatedAt)
}

export function loseHeart(state: ProgressState, now: number): ProgressState {
  const c = currentHearts(state, now)
  // Refill timing starts from the moment the first heart is lost.
  const heartsUpdatedAt = c.hearts >= MAX_HEARTS ? now : c.heartsUpdatedAt
  return { ...state, hearts: Math.max(0, c.hearts - 1), heartsUpdatedAt }
}

export function refillHearts(state: ProgressState, now: number): ProgressState {
  return { ...state, hearts: MAX_HEARTS, heartsUpdatedAt: now }
}

// ---------- Streak ----------

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d - 1))
}

/** Call when an activity is finished. Counts consecutive local days. */
export function registerActivity(state: ProgressState, now: Date): ProgressState {
  const today = dayKey(now)
  if (state.lastActiveDay === today) return state
  const streak = state.lastActiveDay === previousDay(today) ? state.streak + 1 : 1
  return { ...state, streak, bestStreak: Math.max(state.bestStreak, streak), lastActiveDay: today }
}

/** The streak as it should be shown today (0 if the child missed yesterday). */
export function visibleStreak(state: Pick<ProgressState, 'streak' | 'lastActiveDay'>, now: Date): number {
  const today = dayKey(now)
  if (state.lastActiveDay === today || state.lastActiveDay === previousDay(today)) return state.streak
  return 0
}

// ---------- Answers and completion ----------

export function recordAnswer(state: ProgressState, wordIds: readonly string[], correct: boolean, now: number): ProgressState {
  const memory = { ...state.memory }
  for (const id of wordIds) memory[id] = review(memory[id], correct, now)
  return { ...state, memory, xp: state.xp + (correct ? XP.correctAnswer : 0) }
}

export interface LessonResult {
  lessonId: string
  mistakes: number
}

export function completeLesson(state: ProgressState, result: LessonResult, now: Date): ProgressState {
  const perfect = result.mistakes === 0
  const prev = state.completedLessons[result.lessonId]
  const next: ProgressState = {
    ...state,
    xp: state.xp + XP.lessonComplete + (perfect ? XP.perfectBonus : 0),
    perfectCount: state.perfectCount + (perfect ? 1 : 0),
    completedLessons: {
      ...state.completedLessons,
      [result.lessonId]: { at: now.getTime(), perfect: perfect || (prev?.perfect ?? false) },
    },
  }
  return registerActivity(next, now)
}

/** Finishing a practice round always refills every heart. */
export function completePractice(state: ProgressState, now: Date): ProgressState {
  const next = refillHearts(
    { ...state, xp: state.xp + XP.practiceComplete, practiceCount: state.practiceCount + 1 },
    now.getTime(),
  )
  return registerActivity(next, now)
}

export function completeStory(state: ProgressState, chapterId: string, now: Date): ProgressState {
  const first = !state.completedStories[chapterId]
  const next = {
    ...state,
    xp: state.xp + (first ? XP.storyComplete : XP.practiceComplete),
    completedStories: { ...state.completedStories, [chapterId]: state.completedStories[chapterId] ?? now.getTime() },
  }
  return registerActivity(next, now)
}
