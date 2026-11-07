export interface Result {
  correct: boolean;
  /** The right answer, shown when the learner was wrong. */
  answer?: string;
  /** Meaning of the item, in the interface language. */
  meaning?: string;
  /** An extra, specific hint (e.g. about long and short sounds). */
  hint?: string;
  /** Override the panel title. */
  title?: string;
}

export interface ExerciseProps<S> {
  step: S;
  /** True while the feedback panel is showing. */
  locked: boolean;
  name: string;
  /** Graded answer: shows the feedback panel. */
  onResult: (r: Result) => void;
  /** A mistake that does not end the exercise (match pairs, dialogue choices). */
  onMistake: () => void;
  /** Non-graded step finished. */
  onNext: () => void;
}
