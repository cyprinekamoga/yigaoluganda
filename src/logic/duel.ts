/**
 * Duels: two players answer the same quick quiz at the same time.
 * Both devices build the quiz from the same seed and word list, so nothing but
 * the seed, the word ids and the live scores ever travels between them.
 */
import { allLessons, vocabulary, wordsUpTo } from '../content'
import { choiceSet, hasPicture, type Exercise } from './generator'
import type { DuelOutcome, ProgressState } from './progress'
import { createRng, sample } from './rng'

export const DUEL_LENGTH = 8
/** Answers faster than this earn a speed bonus. */
export const SPEED_MS = 10_000
const MIN_POOL = 12

const knownIds = new Set(vocabulary.map((w) => w.id))

/** How far a player has come: the number of finished lessons. */
export function duelLevel(state: ProgressState): number {
  return Object.keys(state.completedLessons).length
}

/** Words both players have met (the lower level decides), with a few early words added if needed. */
export function pickDuelWords(levelA: number, levelB: number, seed: number): string[] {
  let index = Math.max(0, Math.min(levelA, levelB) - 1)
  while (wordsUpTo(index).length < MIN_POOL && index < allLessons.length - 1) index++
  return sample(wordsUpTo(index), DUEL_LENGTH, createRng(seed))
}

/** Only keeps ids the app knows (the list arrives from the other player's device). */
export function cleanWordIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === 'string' && knownIds.has(id)).slice(0, DUEL_LENGTH)
}

/** The quiz. Identical on both devices for the same words and seed, whichever language each child learns from. */
export function generateDuel(wordIds: string[], seed: number): Exercise[] {
  const rng = createRng(seed)
  const known = wordsUpTo(allLessons.length - 1)
  return wordIds.map((id, i): Exercise => {
    const w = vocabulary.find((v) => v.id === id)!
    const base = `duel-${i}`
    if (hasPicture(w) && i % 2 === 0)
      return { id: base, kind: 'pictureToWord', wordId: id, wordIds: [id], options: choiceSet(w, rng, known, 'en', true) }
    if (hasPicture(w) && i % 3 === 1)
      return { id: base, kind: 'wordToPicture', wordId: id, wordIds: [id], options: choiceSet(w, rng, known, 'en', true) }
    return {
      id: base,
      kind: 'translate',
      wordId: id,
      direction: i % 2 ? 'fromLuganda' : 'toLuganda',
      wordIds: [id],
      options: choiceSet(w, rng, known, 'en'),
    }
  })
}

/** 100 for a right answer plus up to 50 for speed. */
export function duelPoints(correct: boolean, ms: number): number {
  if (!correct) return 0
  return 100 + Math.round(50 * Math.max(0, 1 - ms / SPEED_MS))
}

export function duelOutcome(mine: number, theirs: number): DuelOutcome {
  return mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw'
}

/** Short random id for a duel (also the name of its private room). */
export function newDuelId(): string {
  return Math.random().toString(36).slice(2, 10)
}
