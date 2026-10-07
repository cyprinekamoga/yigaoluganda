import { describe, expect, it } from 'vitest'
import { cleanWordIds, duelOutcome, duelPoints, DUEL_LENGTH, generateDuel, pickDuelWords } from './duel'
import { completeDuel, initialState } from './progress'
import { awardBadges } from './badges'

describe('duels', () => {
  it('builds the same quiz on both devices', () => {
    const words = pickDuelWords(3, 7, 42)
    expect(words).toHaveLength(DUEL_LENGTH)
    expect(pickDuelWords(7, 3, 42)).toEqual(words)
    expect(generateDuel(words, 42)).toEqual(generateDuel([...words], 42))
  })

  it('asks only single-choice questions with the right answer among the options', () => {
    for (const seed of [1, 2, 3, 99]) {
      for (const ex of generateDuel(pickDuelWords(0, 20, seed), seed)) {
        expect(['translate', 'pictureToWord', 'wordToPicture']).toContain(ex.kind)
        if ('options' in ex && 'wordId' in ex) expect(ex.options).toContain(ex.wordId)
      }
    }
  })

  it('beginners still get a full quiz', () => {
    expect(pickDuelWords(0, 0, 5)).toHaveLength(DUEL_LENGTH)
  })

  it('drops unknown word ids from the other device', () => {
    const [a] = pickDuelWords(1, 1, 1)
    expect(cleanWordIds([a, 'nope', 3, null])).toEqual([a])
    expect(cleanWordIds('x')).toEqual([])
  })

  it('scores right answers with a speed bonus', () => {
    expect(duelPoints(false, 100)).toBe(0)
    expect(duelPoints(true, 0)).toBe(150)
    expect(duelPoints(true, 60_000)).toBe(100)
    expect(duelOutcome(300, 200)).toBe('win')
    expect(duelOutcome(200, 200)).toBe('draw')
    expect(duelOutcome(100, 200)).toBe('loss')
  })

  it('counts duels, gives XP and badges', () => {
    let s = initialState(0, 'en')
    s = completeDuel(s, 'win', new Date(2026, 0, 1))
    expect(s.duelWins).toBe(1)
    expect(s.duelsPlayed).toBe(1)
    expect(s.xp).toBe(15)
    expect(awardBadges(s, 0).earned).toEqual(expect.arrayContaining(['firstDuel', 'duelWin']))
    s = completeDuel(s, 'loss', new Date(2026, 0, 1))
    expect(s.duelWins).toBe(1)
    expect(s.xp).toBe(20)
  })
})
