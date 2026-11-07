import { normalize, optionForm } from './text';
import { shuffle, type Rng } from './rng';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
/** Consonants that are not doubled in Luganda spelling. */
const NEVER_DOUBLE = new Set(['w', 'y', 'h', "'"]);

/**
 * Misspellings of one word that only change a sound's length:
 * a doubled letter becomes single, or a single letter becomes doubled.
 * These train the most important distinction in Luganda spelling.
 */
export function lengthVariants(word: string): string[] {
  const chars = [...word];
  const out = new Set<string>();
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const lower = c.toLowerCase();
    if (!/[a-zŋ]/i.test(c)) continue;
    if (chars[i + 1]?.toLowerCase() === lower) {
      // double → single
      out.add([...chars.slice(0, i), ...chars.slice(i + 1)].join(''));
      i++;
      continue;
    }
    if (chars[i - 1]?.toLowerCase() === lower) continue;
    if (NEVER_DOUBLE.has(lower)) continue;
    // y in "ny" belongs to n; only double the n
    if (lower === 'y' && chars[i - 1]?.toLowerCase() === 'n') continue;
    if (!VOWELS.has(lower) && i === chars.length - 1) continue; // Luganda words end in vowels
    out.add([...chars.slice(0, i + 1), lower, ...chars.slice(i + 1)].join(''));
  }
  out.delete(word);
  return [...out];
}

/** Length-misspellings of a whole phrase (one word changed at a time). */
export function phraseVariants(lg: string): string[] {
  const base = optionForm(lg);
  const words = base.split(' ');
  const out: string[] = [];
  words.forEach((w, wi) => {
    for (const v of lengthVariants(w)) {
      const copy = [...words];
      copy[wi] = v;
      out.push(copy.join(' '));
    }
  });
  return out;
}

/**
 * Pick `count` wrong spellings for a phrase. Real words (anything in `realForms`)
 * are never offered as "wrong", so a learner is never told a real word is a typo.
 */
export function spellingDistractors(lg: string, realForms: Set<string>, rng: Rng, count = 2): string[] {
  const seen = new Set<string>([normalize(lg)]);
  const out: string[] = [];
  for (const v of shuffle(phraseVariants(lg), rng)) {
    const n = normalize(v);
    if (seen.has(n) || realForms.has(n)) continue;
    seen.add(n);
    out.push(v);
    if (out.length === count) break;
  }
  return out;
}
