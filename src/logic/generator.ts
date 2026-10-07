/**
 * Builds the list of exercises for a lesson, a practice round or a story quiz.
 * Content authors only list words, fill-ins and questions in content/units.json;
 * this module turns them into varied exercises.
 */
import {
  allLessons,
  getLessonRef,
  getWord,
  hasAudio,
  optionText,
  isLuganda,
  vocabulary,
  wordsUpTo,
  type Lang,
  type Question,
  type Word,
} from '../content'
import { normalize, toTiles } from './answer'
import { createRng, hashString, sample, shuffle, type Rng } from './rng'

interface Base {
  id: string
  /** Words whose memory is updated when this exercise is answered. */
  wordIds: string[]
}

export type Exercise =
  | (Base & { kind: 'wordToPicture'; wordId: string; options: string[]; intro?: boolean })
  | (Base & { kind: 'pictureToWord'; wordId: string; options: string[] })
  | (Base & { kind: 'translate'; wordId: string; direction: 'fromLuganda' | 'toLuganda'; options: string[]; intro?: boolean })
  | (Base & { kind: 'listen'; wordId: string; options: string[] })
  | (Base & { kind: 'pairs' })
  | (Base & { kind: 'build'; wordId: string; tiles: string[] })
  | (Base & {
      kind: 'fill'
      /** Sentence with ___ for the gap. */
      text: string
      textIsLuganda: boolean
      /** Meaning of the whole sentence (when the sentence itself is Luganda). */
      hint?: string
      options: string[]
      answer: string
    })
  | (Base & {
      kind: 'question'
      prompt: string
      image?: string
      options: { text: string; luganda: boolean }[]
      answer: number
    })
  | (Base & { kind: 'type'; wordId: string })

export type ExerciseKind = Exercise['kind']

export const MAX_LESSON_EXERCISES = 14
const CHOICES = 3

// ---------- helpers ----------

/** Pictures that can actually be drawn (emoji, counting or clock). */
export function hasPicture(w: Word): boolean {
  return Boolean(w.image)
}

function isPhrase(w: Word): boolean {
  return toTiles(w.lg).length >= 2
}

/**
 * Choose wrong options for a word. Prefers the same category and words the child has already met,
 * and never picks two options that would look the same on screen.
 */
export function pickDistractors(
  target: Word,
  rng: Rng,
  opts: { count?: number; known?: string[]; needPicture?: boolean; lang?: Lang } = {},
): string[] {
  const { count = CHOICES - 1, known = [], needPicture = false, lang } = opts
  const knownSet = new Set(known)
  const looksSame = (a: Word, b: Word) =>
    normalize(a.lg) === normalize(b.lg) ||
    (lang ? normalize(a[lang]) === normalize(b[lang]) : false) ||
    (needPicture && a.image === b.image)
  const candidates = vocabulary.filter((w) => w.id !== target.id && (!needPicture || hasPicture(w)) && !looksSame(w, target))
  const score = (w: Word) => (w.category === target.category ? 2 : 0) + (knownSet.has(w.id) ? 1 : 0) + rng()
  const ranked = [...candidates].sort((a, b) => score(b) - score(a))
  const chosen: Word[] = []
  for (const w of ranked) {
    if (chosen.length >= count) break
    if (chosen.some((c) => looksSame(c, w))) continue
    chosen.push(w)
  }
  return chosen.map((w) => w.id)
}

export function choiceSet(word: Word, rng: Rng, known: string[], lang: Lang, needPicture = false): string[] {
  return shuffle([word.id, ...pickDistractors(word, rng, { known, needPicture, lang })], rng)
}

/** Whole single words (not fragments of phrases) make the fairest wrong tiles. */
function singleWordPool(ids: string[], exclude: Set<string>): string[] {
  const words = (list: Word[]) => [...new Set(list.filter((w) => !isPhrase(w)).map((w) => toTiles(w.lg)[0]))].filter((t) => !exclude.has(normalize(t)))
  const known = words(ids.map(getWord))
  return known.length >= 2 ? known : words(vocabulary)
}

function buildTiles(word: Word, rng: Rng, known: string[]): string[] {
  const tiles = toTiles(word.lg)
  const extra = sample(singleWordPool(known, new Set(tiles.map(normalize))), 2, rng)
  return shuffle([...tiles, ...extra], rng)
}

function phraseBlank(word: Word, rng: Rng, known: string[], lang: Lang, id: string): Exercise | null {
  const tiles = toTiles(word.lg)
  if (tiles.length < 2) return null
  // Blank the longest tile: usually the content word, not a little helper word.
  const index = tiles.reduce((best, t, i) => (t.length > tiles[best].length ? i : best), 0)
  const answer = tiles[index]
  const wrong = sample(singleWordPool(known, new Set(tiles.map(normalize))), 2, rng)
  const text = tiles.map((t, i) => (i === index ? '___' : t)).join(' ')
  return { id, kind: 'fill', wordIds: [word.id], text, textIsLuganda: true, hint: word[lang], options: shuffle([answer, ...wrong], rng), answer }
}

export function questionExercise(q: Question, lang: Lang, rng: Rng, id: string): Exercise {
  const options = q.options.map((o) => ({ text: optionText(o, lang), luganda: isLuganda(o) }))
  const order = shuffle(options.map((_, i) => i), rng)
  return {
    id,
    kind: 'question',
    wordIds: [],
    prompt: q.prompt[lang],
    image: q.image,
    options: order.map((i) => options[i]),
    answer: order.indexOf(0),
  }
}

/** Short, single words without punctuation are fair to type. */
function typeable(w: Word): boolean {
  return !isPhrase(w) && w.lg.length <= 10 && !/[?!.]/.test(w.lg)
}

// ---------- lessons ----------

export interface GenerateOptions {
  lang: Lang
  seed?: number
  /** Word ids the child finds hard, used for the review part of a lesson. */
  weakWords?: string[]
}

export function generateLesson(lessonId: string, { lang, seed, weakWords = [] }: GenerateOptions): Exercise[] {
  const ref = getLessonRef(lessonId)
  if (!ref) throw new Error(`Unknown lesson: ${lessonId}`)
  const rng = createRng(seed ?? hashString(lessonId))
  const { lesson } = ref
  const known = wordsUpTo(ref.index)
  const newWords = lesson.words.map(getWord)
  const newIds = new Set(lesson.words)
  let n = 0
  const nextId = (kind: string) => `${lessonId}-${kind}-${n++}`

  // 1. Meet each new word.
  const intro: Exercise[] = newWords.map((w) =>
    hasPicture(w)
      ? { id: nextId('w2p'), kind: 'wordToPicture', wordId: w.id, wordIds: [w.id], options: choiceSet(w, rng, known, lang, true), intro: true }
      : { id: nextId('tr'), kind: 'translate', wordId: w.id, direction: 'fromLuganda', wordIds: [w.id], options: choiceSet(w, rng, known, lang), intro: true },
  )

  // 2. Match pairs with the new words.
  const pairs: Exercise[] = []
  if (newWords.length >= 3) {
    const ids = sample(lesson.words, Math.min(5, lesson.words.length), rng)
    pairs.push({ id: nextId('pairs'), kind: 'pairs', wordIds: ids })
  }

  // 3. Recall each new word the other way round.
  const recall: Exercise[] = shuffle(newWords, rng).map((w) =>
    hasPicture(w) && rng() < 0.5
      ? { id: nextId('p2w'), kind: 'pictureToWord', wordId: w.id, wordIds: [w.id], options: choiceSet(w, rng, known, lang, true) }
      : { id: nextId('tr'), kind: 'translate', wordId: w.id, direction: 'toLuganda', wordIds: [w.id], options: choiceSet(w, rng, known, lang) },
  )

  // 4. Listen (only where a real recording exists).
  const listen: Exercise[] = newWords
    .filter((w) => hasAudio(w.id))
    .slice(0, 2)
    .map((w) => ({ id: nextId('listen'), kind: 'listen', wordId: w.id, wordIds: [w.id], options: choiceSet(w, rng, known, lang) }))

  // 5. Review a couple of earlier words, weakest first.
  const earlier = known.filter((id) => !newIds.has(id))
  const reviewIds = [...weakWords.filter((id) => earlier.includes(id)), ...shuffle(earlier, rng)]
  const review: Exercise[] = [...new Set(reviewIds)].slice(0, 2).map((id) => {
    const w = getWord(id)
    return { id: nextId('rev'), kind: 'translate', wordId: id, direction: 'fromLuganda', wordIds: [id], options: choiceSet(w, rng, known, lang) }
  })

  // 6. Build phrases from tiles.
  const build: Exercise[] = newWords
    .filter((w) => isPhrase(w) && toTiles(w.lg).length <= 6)
    .slice(0, 2)
    .map((w) => ({ id: nextId('build'), kind: 'build', wordId: w.id, wordIds: [w.id], tiles: buildTiles(w, rng, known) }))

  // 7. Fill the gap: the book's own sentences first, otherwise a gap in a phrase.
  const fills: Exercise[] = sample(lesson.fillIns ?? [], 3, rng).map((f) => ({
    id: nextId('fill'),
    kind: 'fill',
    wordIds: [f.answer],
    text: f.text[lang],
    textIsLuganda: false,
    options: shuffle(f.options.length ? f.options : [f.answer, ...pickDistractors(getWord(f.answer), rng, { known })], rng).map((o) => getWord(o).lg),
    answer: getWord(f.answer).lg,
  }))
  if (!fills.length) {
    const phrase = newWords.find((w) => isPhrase(w) && !build.some((b) => b.wordIds[0] === w.id)) ?? newWords.find(isPhrase)
    const blank = phrase && phraseBlank(phrase, rng, known, lang, nextId('fill'))
    if (blank) fills.push(blank)
  }

  // 8. The book's own multiple-choice questions.
  const questions = sample(lesson.questions ?? [], 3, rng).map((q) => questionExercise(q, lang, rng, nextId('q')))

  // 9. One typing task once children have done a few lessons.
  const typing: Exercise[] = []
  const typeWord = ref.index >= 2 ? shuffle(newWords.filter(typeable), rng)[0] : undefined
  if (typeWord) typing.push({ id: nextId('type'), kind: 'type', wordId: typeWord.id, wordIds: [typeWord.id] })

  const fixed = intro.length + pairs.length + listen.length + build.length + fills.length + questions.length + typing.length
  const room = Math.max(2, MAX_LESSON_EXERCISES - fixed)
  const middle = shuffle([...listen, ...recall.slice(0, room), ...review.slice(0, Math.max(0, room - recall.length))], rng)

  return [...intro, ...pairs, ...middle, ...build, ...fills, ...questions, ...typing]
}

// ---------- practice ----------

/** A practice round for the given (usually weak) words. */
export function generatePractice(wordIds: string[], { lang, seed = Date.now() }: GenerateOptions): Exercise[] {
  const rng = createRng(seed)
  const words = wordIds.map(getWord)
  const known = wordsUpTo(allLessons.length - 1)
  let n = 0
  const nextId = (kind: string) => `practice-${kind}-${n++}`
  const out: Exercise[] = words.flatMap((w, i): Exercise[] => {
    if (isPhrase(w) && toTiles(w.lg).length <= 6 && i % 2 === 0)
      return [{ id: nextId('build'), kind: 'build', wordId: w.id, wordIds: [w.id], tiles: buildTiles(w, rng, known) }]
    if (hasAudio(w.id) && i % 3 === 0)
      return [{ id: nextId('listen'), kind: 'listen', wordId: w.id, wordIds: [w.id], options: choiceSet(w, rng, known, lang) }]
    if (hasPicture(w) && i % 2 === 1)
      return [{ id: nextId('p2w'), kind: 'pictureToWord', wordId: w.id, wordIds: [w.id], options: choiceSet(w, rng, known, lang, true) }]
    return [{ id: nextId('tr'), kind: 'translate', wordId: w.id, direction: i % 2 ? 'fromLuganda' : 'toLuganda', wordIds: [w.id], options: choiceSet(w, rng, known, lang) }]
  })
  if (words.length >= 3) out.push({ id: nextId('pairs'), kind: 'pairs', wordIds: sample(wordIds, Math.min(5, wordIds.length), rng) })
  return out
}

// ---------- stories ----------

export function generateStoryQuiz(questions: Question[], lang: Lang, chapterId: string): Exercise[] {
  const rng = createRng(hashString(chapterId))
  return questions.map((q, i) => questionExercise(q, lang, rng, `${chapterId}-q-${i}`))
}
