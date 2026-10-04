import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module
import { validateContent } from './build-content.mjs'
import vocabulary from '../content/vocabulary.json'
import units from '../content/units.json'
import story from '../content/story.json'

describe('content files', () => {
  it('are valid', () => {
    expect(validateContent({ vocabulary, units, story })).toEqual([])
  })
  it('catches broken references', () => {
    const broken = structuredClone(units)
    broken[0].lessons[0].words.push('not-a-word')
    expect(validateContent({ vocabulary, units: broken, story }).join()).toContain('unknown word "not-a-word"')
  })
  it('keeps every word tied to a book page and a difficulty', () => {
    for (const w of vocabulary) {
      expect(w.page).toBeGreaterThan(0)
      expect([1, 2, 3]).toContain(w.difficulty)
    }
  })
})
