import { describe, expect, it } from 'vitest'
import { checkAnswer, collapseDoubles, normalize, tilesMatch, toTiles } from './answer'

describe('normalize', () => {
  it('ignores capital letters, extra spaces and punctuation', () => {
    expect(normalize('  Oli   OTYA? ')).toBe('oli otya')
    expect(normalize('Weebale nnyo!')).toBe('weebale nnyo')
  })
  it('removes accents', () => {
    expect(normalize('Wéébàle')).toBe('weebale')
    expect(normalize('Ökända')).toBe('okanda')
  })
  it("treats ng' and ŋ as the same letter and unifies apostrophes", () => {
    expect(normalize("ng'enda")).toBe(normalize('ŋenda'))
    expect(normalize('akaana k’enkoko')).toBe("akaana k'enkoko")
  })
})

describe('checkAnswer', () => {
  it('accepts exact and loosely typed answers', () => {
    expect(checkAnswer('amazzi', ['amazzi'])).toBe('correct')
    expect(checkAnswer('AMAZZI', ['amazzi'])).toBe('correct')
    expect(checkAnswer('  amazzi  ', ['amazzi'])).toBe('correct')
    expect(checkAnswer('Ámazzì', ['amazzi'])).toBe('correct')
    expect(checkAnswer('oli  otya', ['Oli otya?'])).toBe('correct')
  })
  it('accepts book spelling variants', () => {
    expect(checkAnswer('emotoka', ['emmotoka', 'emotoka'])).toBe('correct')
  })
  it('never silently accepts a missing double letter, but calls it a near miss', () => {
    expect(checkAnswer('amazi', ['amazzi'])).toBe('near-miss-doubles')
    expect(checkAnswer('webale', ['weebale'])).toBe('near-miss-doubles')
  })
  it('rejects wrong and empty answers', () => {
    expect(checkAnswer('ente', ['amazzi'])).toBe('wrong')
    expect(checkAnswer('   ', ['amazzi'])).toBe('wrong')
  })
  it('collapses doubles only for comparison', () => {
    expect(collapseDoubles('ssaawa kkumi')).toBe('sawa kumi')
  })
})

describe('tiles', () => {
  it('splits a phrase into tiles without punctuation', () => {
    expect(toTiles('Yee, enjala enuma.')).toEqual(['Yee', 'enjala', 'enuma'])
    expect(toTiles("akaana k'enkoko")).toEqual(['akaana', "k'enkoko"])
  })
  it('matches built phrases loosely', () => {
    expect(tilesMatch(['Yee', 'enjala', 'enuma'], 'Yee, enjala enuma.')).toBe(true)
    expect(tilesMatch(['enjala', 'Yee', 'enuma'], 'Yee, enjala enuma.')).toBe(false)
  })
})
