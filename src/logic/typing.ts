import { normalize, optionForm } from './text';

/**
 * Grading a typed answer. Capitals, punctuation, extra spaces and the way ŋ is typed (ŋ or ng')
 * never matter. Sound length always matters (a doubled letter changes the meaning), so an answer
 * that is only wrong in length is wrong, with a hint. One slip of a letter in a longer answer is
 * forgiven, and the learner is shown the right spelling.
 */
export type TypedGrade = 'correct' | 'typo' | 'length' | 'wrong';

/** Levenshtein distance, stopping early once it is above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** The same text with every doubled letter made single (to spot length-only mistakes). */
const single = (s: string) => s.replace(/(.)\1+/g, '$1');

/** How a typed answer compares with the accepted spellings of a phrase. */
export function gradeTyped(input: string, answers: string[]): TypedGrade {
  const typed = normalize(input);
  if (!typed) return 'wrong';
  const forms = answers.map((a) => normalize(optionForm(a)));
  if (forms.includes(typed)) return 'correct';
  if (forms.some((f) => single(f) === single(typed))) return 'length';
  // One slip (a wrong, missing or extra letter) in an answer of 6 letters or more. A slip that
  // only changes a sound's length was caught above.
  if (forms.some((f) => f.replace(/ /g, '').length >= 6 && editDistance(typed, f, 1) === 1)) return 'typo';
  return 'wrong';
}

/** Every spelling that counts for a phrase: the phrase itself and its listed variants. */
export function acceptedForms(lg: string, variants: string[] = []): string[] {
  return [optionForm(lg), ...variants];
}
