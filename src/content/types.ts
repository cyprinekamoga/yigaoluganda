/** The two languages a learner can learn Luganda *from* (and the two UI languages). */
export type Lang = 'en' | 'sv'

export type Localized = Record<Lang, string>

export interface Word {
  id: string
  /** Luganda spelling taught by the app. */
  lg: string
  en: string
  sv: string
  category: string
  /** PDF page in the source book. */
  page: number
  difficulty: 1 | 2 | 3
  /** An emoji, `count:N` (N pictures to count) or `clock:H` (a clock face). */
  image?: string
  /** Other spellings that are accepted when typing. */
  variants?: string[]
  note?: Localized
  literal?: Localized
  /** Why this item needs a native-speaker check (shown in CONTENT_REPORT.md, not in the app). */
  check?: string
}

/** A multiple-choice option: Luganda text, or text in the learner's language. */
export type ChoiceOption = { lg: string } | Localized

export interface Question {
  prompt: Localized
  /** The FIRST option is the correct one. The app shuffles them. */
  options: ChoiceOption[]
  image?: string
  page?: number
  added?: boolean
}

export interface FillIn {
  /** Sentence with `___` where the missing word goes. */
  text: Localized
  /** Word id of the right answer. */
  answer: string
  /** Word ids shown as choices (should include the answer). */
  options: string[]
  page?: number
}

export interface Lesson {
  id: string
  title: Localized
  words: string[]
  fillIns?: FillIn[]
  questions?: Question[]
}

export interface Unit {
  id: string
  emoji: string
  pages: string
  lgTitle?: string
  title: Localized
  story?: string
  culture?: Localized
  lessons: Lesson[]
}

export interface StoryLine {
  speaker: string
  lg: string
  en: string
  sv: string
  page?: number
}

export interface StoryScene {
  scene: string
  props: string[]
  /** Narration. `{wordId}` marks a Luganda word that the child can tap. */
  text: Localized
  lines?: StoryLine[]
}

export interface StoryChapter {
  id: string
  unit: string
  page: number
  lgTitle: string
  title: Localized
  scenes: StoryScene[]
  questions: Question[]
}

export interface Speaker {
  name: string | Localized
  emoji: string
}

export interface Story {
  title: Localized
  lgTitle: string
  speakers: Record<string, Speaker>
  chapters: StoryChapter[]
}
