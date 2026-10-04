import { describe, expect, it } from 'vitest'
import { BOX_INTERVAL_DAYS, countDue, countLearned, newMemory, pickPracticeWords, review, type MemoryMap } from './srs'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 0, 10)

describe('review (Leitner boxes)', () => {
  it('moves a new word to box 1, due tomorrow', () => {
    const m = review(undefined, true, T0)
    expect(m.box).toBe(1)
    expect(m.due).toBe(T0 + BOX_INTERVAL_DAYS[1] * DAY)
  })
  it('does not promote a word that is answered again before it is due', () => {
    const m1 = review(undefined, true, T0)
    const m2 = review(m1, true, T0 + 1000)
    expect(m2.box).toBe(1)
    expect(m2.correct).toBe(2)
  })
  it('promotes a due word and doubles the interval', () => {
    let m = review(undefined, true, T0)
    m = review(m, true, m.due)
    expect(m.box).toBe(2)
    m = review(m, true, m.due)
    expect(m.box).toBe(3)
  })
  it('sends a missed word back to box 1 and makes it due now', () => {
    let m = review(undefined, true, T0)
    m = review(m, true, m.due)
    m = review(m, false, T0 + 5 * DAY)
    expect(m.box).toBe(1)
    expect(m.due).toBe(T0 + 5 * DAY)
    expect(m.wrong).toBe(1)
  })
  it('never goes above the top box', () => {
    let m = newMemory(T0)
    for (let i = 0; i < 20; i++) m = review(m, true, m.due)
    expect(m.box).toBe(BOX_INTERVAL_DAYS.length - 1)
  })
})

describe('practice selection', () => {
  const memory: MemoryMap = {
    strong: { box: 4, due: T0 + 8 * DAY, correct: 9, wrong: 0, lastSeen: T0 },
    weakDue: { box: 1, due: T0 - 1, correct: 1, wrong: 3, lastSeen: T0 },
    okDue: { box: 2, due: T0 - 1, correct: 3, wrong: 1, lastSeen: T0 },
    notDue: { box: 1, due: T0 + DAY, correct: 1, wrong: 0, lastSeen: T0 },
  }
  it('picks due words first, weakest first', () => {
    expect(pickPracticeWords(memory, T0, 3)).toEqual(['weakDue', 'okDue', 'notDue'])
  })
  it('counts due and learned words', () => {
    expect(countDue(memory, T0)).toBe(2)
    expect(countLearned(memory)).toBe(4)
  })
})
