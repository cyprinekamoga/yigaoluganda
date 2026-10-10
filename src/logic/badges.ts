import { story } from '../content'
import type { ProgressState } from './progress'
import { countLearned } from './srs'
import { isUnitComplete } from './unlock'

export interface BadgeDef {
  id: string
  emoji: string
  /** True when the badge has been earned. */
  test: (s: ProgressState) => boolean
}

const lessons = (s: ProgressState) => Object.keys(s.completedLessons).length

// Titles and descriptions live in the translation files under badges.<id>.
export const BADGES: BadgeDef[] = [
  { id: 'firstLesson', emoji: '🐣', test: (s) => lessons(s) >= 1 },
  { id: 'packed', emoji: '🧳', test: (s) => isUnitComplete(s, 'u01') },
  { id: 'landed', emoji: '✈️', test: (s) => isUnitComplete(s, 'u02') },
  { id: 'counter', emoji: '🔢', test: (s) => isUnitComplete(s, 'u04') },
  { id: 'respect', emoji: '🙇🏾', test: (s) => isUnitComplete(s, 'u05') },
  { id: 'fiveLessons', emoji: '🖐🏾', test: (s) => lessons(s) >= 5 },
  { id: 'twentyLessons', emoji: '🏅', test: (s) => lessons(s) >= 20 },
  { id: 'perfect', emoji: '💯', test: (s) => s.perfectCount >= 1 },
  { id: 'firstStory', emoji: '📖', test: (s) => Object.keys(s.completedStories).length >= 1 },
  { id: 'allStories', emoji: '🏆', test: (s) => story.chapters.every((c) => s.completedStories[c.id]) },
  { id: 'streak3', emoji: '🌤️', test: (s) => s.bestStreak >= 3 },
  { id: 'streak7', emoji: '🌟', test: (s) => s.bestStreak >= 7 },
  { id: 'xp100', emoji: '🐚', test: (s) => s.xp >= 100 },
  { id: 'xp500', emoji: '🌠', test: (s) => s.xp >= 500 },
  { id: 'practice5', emoji: '💪🏾', test: (s) => s.practiceCount >= 5 },
  { id: 'words50', emoji: '🗣️', test: (s) => countLearned(s.memory) >= 50 },
  { id: 'firstDuel', emoji: '⚔️', test: (s) => (s.duelsPlayed ?? 0) >= 1 },
  { id: 'duelWin', emoji: '🥇', test: (s) => (s.duelWins ?? 0) >= 1 },
  { id: 'duelChampion', emoji: '👑', test: (s) => (s.duelWins ?? 0) >= 5 },
]

/** Adds any newly earned badges. Returns the new state and the ids that were just earned. */
export function awardBadges(state: ProgressState, now: number): { state: ProgressState; earned: string[] } {
  const earned = BADGES.filter((b) => !state.badges[b.id] && b.test(state)).map((b) => b.id)
  if (!earned.length) return { state, earned }
  const badges = { ...state.badges }
  for (const id of earned) badges[id] = now
  return { state: { ...state, badges }, earned }
}
