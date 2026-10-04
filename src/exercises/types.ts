import type { Exercise } from '../logic/generator'
import type { Lang } from '../content/types'

export interface ExerciseResult {
  correct: boolean
  /** The answer was right except for a double letter (typing only). */
  nearMissDoubles?: boolean
  /** What to show as the right answer. */
  solution: string
  solutionIsLuganda: boolean
  /** Meaning shown under the answer, in the learner's language. */
  meaning?: string
  /** Per-word results (for match pairs). Otherwise every id in exercise.wordIds gets `correct`. */
  wordResults?: Record<string, boolean>
}

export interface ExerciseProps<K extends Exercise['kind'] = Exercise['kind']> {
  exercise: Extract<Exercise, { kind: K }>
  lang: Lang
  /** True once the answer has been checked: the view shows right/wrong and locks input. */
  checked: boolean
  /** Report what the current answer would score, or null when nothing is chosen yet. */
  setPending: (result: ExerciseResult | null) => void
  /** For exercises that finish themselves (match pairs). */
  submit: (result: ExerciseResult) => void
}
