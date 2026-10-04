import { describe, expect, it } from 'vitest'
import { allLessons, getWord, story } from '../content'
import { MAX_LESSON_EXERCISES, generateLesson, generatePractice, generateStoryQuiz, pickDistractors } from './generator'
import { answer, current, isFinished, next, startSession } from './session'
import { createRng } from './rng'
import { normalize } from './answer'

describe('generateLesson', () => {
  it('is deterministic for the same seed', () => {
    expect(generateLesson('u01-l1', { lang: 'sv', seed: 1 })).toEqual(generateLesson('u01-l1', { lang: 'sv', seed: 1 }))
  })

  for (const lang of ['sv', 'en'] as const) {
    it(`builds a valid lesson for every lesson in the course (${lang})`, () => {
      for (const { lesson } of allLessons) {
        const ex = generateLesson(lesson.id, { lang, seed: 7 })
        expect(ex.length, lesson.id).toBeGreaterThanOrEqual(lesson.words.length)
        expect(ex.length, lesson.id).toBeLessThanOrEqual(MAX_LESSON_EXERCISES + 6)
        expect(new Set(ex.map((e) => e.id)).size).toBe(ex.length)
        for (const e of ex) {
          if ('options' in e && e.kind !== 'question' && e.kind !== 'fill') {
            expect(e.options).toContain(e.wordId)
            expect(new Set(e.options).size).toBe(e.options.length)
            // No two options may look the same on screen.
            const texts = e.options.map((o) => normalize(getWord(o).lg))
            expect(new Set(texts).size, `${lesson.id} ${e.id}`).toBe(texts.length)
          }
          if (e.kind === 'fill') expect(e.options).toContain(e.answer)
          if (e.kind === 'question') expect(e.answer).toBeGreaterThanOrEqual(0)
        }
        // Every new word appears at least once.
        for (const w of lesson.words) expect(ex.some((e) => e.wordIds.includes(w)), `${lesson.id}/${w}`).toBe(true)
      }
    })
  }

  it('uses the book exercises when a lesson has them', () => {
    const ex = generateLesson('u05-l3', { lang: 'sv', seed: 3 })
    expect(ex.some((e) => e.kind === 'fill' && e.text.includes('___'))).toBe(true)
    expect(ex.some((e) => e.kind === 'question')).toBe(true)
  })

  it('makes tile exercises from phrases', () => {
    const ex = generateLesson('u02-l5', { lang: 'en', seed: 3 })
    expect(ex.some((e) => e.kind === 'build')).toBe(true)
  })

  it('never adds listening exercises without recordings', () => {
    for (const { lesson } of allLessons) expect(generateLesson(lesson.id, { lang: 'en' }).some((e) => e.kind === 'listen')).toBe(false)
  })
})

describe('distractors', () => {
  it('prefers the same category', () => {
    const ids = pickDistractors(getWord('ente'), createRng(1), { count: 2, needPicture: true })
    expect(ids.every((id) => getWord(id).category === 'animals')).toBe(true)
  })
})

describe('practice and stories', () => {
  it('builds a practice round for given words', () => {
    const ex = generatePractice(['amazzi', 'ente', 'oli-otya', 'weebale'], { lang: 'sv', seed: 1 })
    expect(ex.length).toBe(5)
    for (const id of ['amazzi', 'ente', 'oli-otya', 'weebale']) expect(ex.some((e) => e.wordIds.includes(id))).toBe(true)
  })
  it('turns story questions into exercises with the right answer tracked', () => {
    for (const c of story.chapters) {
      const ex = generateStoryQuiz(c.questions, 'sv', c.id)
      ex.forEach((e, i) => {
        if (e.kind !== 'question') throw new Error('expected question')
        expect(e.options[e.answer].text).toBe('lg' in c.questions[i].options[0] ? (c.questions[i].options[0] as { lg: string }).lg : (c.questions[i].options[0] as { sv: string }).sv)
      })
    }
  })
})

describe('session', () => {
  it('repeats a missed exercise once at the end', () => {
    const ex = generateLesson('u01-l1', { lang: 'sv', seed: 2 })
    let s = startSession(ex)
    s = next(answer(s, false))
    expect(s.queue.length).toBe(ex.length + 1)
    expect(s.queue.at(-1)!.id).toBe(`${ex[0].id}-again`)
    while (!isFinished(s)) s = next(answer(s, true))
    expect(s.mistakes).toBe(1)
    expect(current(s)).toBeUndefined()
  })
})
