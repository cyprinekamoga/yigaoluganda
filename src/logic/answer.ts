/**
 * Answer checking for typed and built answers.
 *
 * Forgiving about things that don't change meaning: capital letters, extra spaces,
 * punctuation, accents, different apostrophes, and `ng'` typed instead of `ŋ`.
 *
 * NOT forgiving about double letters: in Luganda, `amazi` and `amazzi` are different spellings
 * and vowel/consonant length can change meaning. A double-letter slip is reported as a
 * "near miss", so the child gets a specific, gentle hint.
 */

const APOSTROPHES = /[’‘`´ʼ]/g
const PUNCTUATION = /[.,!?¿¡;:"“”„«»()\-–—…]/g

export function normalize(input: string): string {
  return input
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/ng'/g, 'ŋ')
    .replace(/ŋ/g, '\u0000') // protect ŋ from accent stripping
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0000/g, 'ŋ')
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Collapse doubled letters ("amazzi" → "amazi"), used only to detect near misses. */
export function collapseDoubles(s: string): string {
  return s.replace(/(.)\1+/g, '$1')
}

export type AnswerResult = 'correct' | 'near-miss-doubles' | 'wrong'

export function checkAnswer(input: string, accepted: readonly string[]): AnswerResult {
  const given = normalize(input)
  if (!given) return 'wrong'
  const targets = accepted.map(normalize)
  if (targets.includes(given)) return 'correct'
  const loose = collapseDoubles(given)
  if (targets.some((t) => collapseDoubles(t) === loose)) return 'near-miss-doubles'
  return 'wrong'
}

/** Split a Luganda phrase into word tiles, keeping apostrophes (e.g. "k'enkoko"). */
export function toTiles(phrase: string): string[] {
  return phrase
    .replace(APOSTROPHES, "'")
    .replace(/[.,!?;:]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

export function tilesMatch(chosen: readonly string[], phrase: string): boolean {
  return normalize(chosen.join(' ')) === normalize(toTiles(phrase).join(' '))
}
