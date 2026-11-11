export interface Result {
  correct: boolean;
  /** The right answer, shown when the learner was wrong. */
  answer?: string;
  /** Meaning of the item, in the interface language. */
  meaning?: string;
  /** An extra, specific hint (e.g. about long and short sounds). */
  hint?: string;
  /** Override the result card's title. */
  title?: string;
}

export interface ExerciseProps<S> {
  step: S;
  /** True while the result card is showing. */
  locked: boolean;
  name: string;
  /** Graded answer: shows the feedback panel. */
  onResult: (r: Result) => void;
  /** A mistake that does not end the exercise (match pairs, dialogue choices). */
  onMistake: () => void;
  /** Non-graded step finished. */
  onNext: () => void;
  /** The result card, shown in the page right under the answer once it is checked. */
  after?: React.ReactNode;
  /** Replaces the step's own footer button (Check becomes Continue). */
  footer?: React.ReactNode;
}
