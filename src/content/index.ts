import vocabularyJson from '../../content/vocabulary.json'
import unitsJson from '../../content/units.json'
import storyJson from '../../content/story.json'
import audioManifest from '../generated/audio-manifest.json'
import type { ChoiceOption, Lang, Lesson, Story, StoryChapter, Unit, Word } from './types'

export * from './types'

export const vocabulary = vocabularyJson as Word[]
export const units = unitsJson as Unit[]
export const story = storyJson as Story

const wordById = new Map(vocabulary.map((w) => [w.id, w]))

export function getWord(id: string): Word {
  const w = wordById.get(id)
  if (!w) throw new Error(`Unknown word id: ${id}`)
  return w
}

export function hasWord(id: string): boolean {
  return wordById.has(id)
}

/** The meaning of a word in the learner's language. */
export function meaning(word: Word, lang: Lang): string {
  return word[lang]
}

export interface LessonRef {
  lesson: Lesson
  unit: Unit
  /** Position in the whole course (0-based). */
  index: number
  /** Position inside the unit (0-based). */
  indexInUnit: number
}

export const allLessons: LessonRef[] = units.flatMap((unit) =>
  unit.lessons.map((lesson, indexInUnit) => ({ lesson, unit, indexInUnit, index: 0 })),
)
allLessons.forEach((ref, i) => (ref.index = i))

const lessonById = new Map(allLessons.map((r) => [r.lesson.id, r]))

export function getLessonRef(id: string): LessonRef | undefined {
  return lessonById.get(id)
}

export function getChapter(id: string): StoryChapter | undefined {
  return story.chapters.find((c) => c.id === id)
}

/** Word ids from every lesson up to and including `index`. */
export function wordsUpTo(index: number): string[] {
  const seen = new Set<string>()
  for (const ref of allLessons.slice(0, index + 1)) ref.lesson.words.forEach((w) => seen.add(w))
  return [...seen]
}

const audioSet = new Set(audioManifest as string[])

/** True when a native-speaker recording exists in /public/audio/<id>.mp3. */
export function hasAudio(wordId: string): boolean {
  return audioSet.has(wordId)
}

export function audioUrl(wordId: string): string {
  return `${import.meta.env.BASE_URL}audio/${wordId}.mp3`
}

export function optionText(option: ChoiceOption, lang: Lang): string {
  return 'lg' in option ? option.lg : option[lang]
}

export function isLuganda(option: ChoiceOption): boolean {
  return 'lg' in option
}
