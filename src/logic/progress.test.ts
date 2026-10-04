import { describe, expect, it } from 'vitest'
import {
  HEART_REFILL_MS, MAX_HEARTS, XP, completeLesson, completePractice, completeStory, currentHearts,
  initialState, loseHeart, msUntilNextHeart, recordAnswer, registerActivity, visibleStreak,
} from './progress'
import { awardBadges } from './badges'
import { isChapterUnlocked, isLessonUnlocked, nextLessonId } from './unlock'
import { units } from '../content'

const day = (d: number, h = 12) => new Date(2026, 2, d, h)

describe('XP', () => {
  it('gives XP for correct answers and lessons, with a perfect bonus', () => {
    let s = initialState(0)
    s = recordAnswer(s, ['amazzi'], true, 0)
    s = recordAnswer(s, ['amazzi'], false, 0)
    expect(s.xp).toBe(XP.correctAnswer)
    s = completeLesson(s, { lessonId: 'u01-l1', mistakes: 0 }, day(1))
    expect(s.xp).toBe(XP.correctAnswer + XP.lessonComplete + XP.perfectBonus)
    s = completeLesson(s, { lessonId: 'u01-l2', mistakes: 2 }, day(1))
    expect(s.xp).toBe(XP.correctAnswer + 2 * XP.lessonComplete + XP.perfectBonus)
    expect(s.perfectCount).toBe(1)
  })
  it('gives full story XP only the first time', () => {
    let s = completeStory(initialState(0), 'ch01', day(1))
    expect(s.xp).toBe(XP.storyComplete)
    s = completeStory(s, 'ch01', day(1))
    expect(s.xp).toBe(XP.storyComplete + XP.practiceComplete)
  })
})

describe('streak', () => {
  it('counts consecutive days and keeps the best streak', () => {
    let s = initialState(0)
    s = registerActivity(s, day(1))
    s = registerActivity(s, day(1, 18))
    expect(s.streak).toBe(1)
    s = registerActivity(s, day(2))
    s = registerActivity(s, day(3, 8))
    expect(s.streak).toBe(3)
    s = registerActivity(s, day(5))
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(3)
  })
  it('works across a month boundary', () => {
    let s = registerActivity(initialState(0), new Date(2026, 0, 31))
    s = registerActivity(s, new Date(2026, 1, 1))
    expect(s.streak).toBe(2)
  })
  it('shows 0 once a day has been missed, without changing saved data', () => {
    const s = registerActivity(registerActivity(initialState(0), day(1)), day(2))
    expect(visibleStreak(s, day(3))).toBe(2)
    expect(visibleStreak(s, day(4))).toBe(0)
  })
})

describe('hearts', () => {
  const t = 1_000_000
  it('starts full and loses one per mistake, never below zero', () => {
    let s = initialState(t)
    expect(s.hearts).toBe(MAX_HEARTS)
    for (let i = 0; i < 7; i++) s = loseHeart(s, t)
    expect(s.hearts).toBe(0)
  })
  it('refills one heart per interval, keeping leftover time', () => {
    let s = loseHeart(loseHeart(initialState(t), t), t)
    expect(currentHearts(s, t + HEART_REFILL_MS - 1).hearts).toBe(3)
    expect(currentHearts(s, t + HEART_REFILL_MS).hearts).toBe(4)
    expect(currentHearts(s, t + 10 * HEART_REFILL_MS).hearts).toBe(MAX_HEARTS)
    s = { ...s, ...currentHearts(s, t + 1.5 * HEART_REFILL_MS) }
    expect(msUntilNextHeart(s, t + 1.5 * HEART_REFILL_MS)).toBe(HEART_REFILL_MS / 2)
  })
  it('refills completely after a practice round', () => {
    let s = initialState(t)
    for (let i = 0; i < 5; i++) s = loseHeart(s, t)
    s = completePractice(s, new Date(t))
    expect(s.hearts).toBe(MAX_HEARTS)
    expect(s.practiceCount).toBe(1)
  })
})

describe('unlocking and badges', () => {
  it('opens lessons one after the other and stories after their unit', () => {
    let s = initialState(0)
    expect(isLessonUnlocked(s, 'u01-l1')).toBe(true)
    expect(isLessonUnlocked(s, 'u01-l2')).toBe(false)
    s = completeLesson(s, { lessonId: 'u01-l1', mistakes: 0 }, day(1))
    expect(isLessonUnlocked(s, 'u01-l2')).toBe(true)
    expect(nextLessonId(s)).toBe('u01-l2')
    expect(isChapterUnlocked(s, 'ch01')).toBe(false)
    for (const l of units[0].lessons) s = completeLesson(s, { lessonId: l.id, mistakes: 1 }, day(1))
    expect(isChapterUnlocked(s, 'ch01')).toBe(true)
  })
  it('awards badges once', () => {
    let s = completeLesson(initialState(0), { lessonId: 'u01-l1', mistakes: 0 }, day(1))
    const first = awardBadges(s, 1)
    expect(first.earned).toEqual(expect.arrayContaining(['firstLesson', 'perfect']))
    s = first.state
    expect(awardBadges(s, 2).earned).toEqual([])
  })
})
