import type { Lang } from '../content';

/**
 * The grown-up check in front of settings, payments and leaving a child's profile: a times
 * question written in words ("What is seven times eight?"), which young children can't read and
 * work out on their own, answered with digits.
 */

const WORDS: Record<Lang, string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  sv: ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio'],
};

export function numberWord(n: number, lang: Lang): string {
  return WORDS[lang][n] ?? String(n);
}

export interface GateQuestion {
  a: number;
  b: number;
  answer: number;
}

/** Both factors between 4 and 9, so the answer has two digits. */
export function gateQuestion(random: () => number = Math.random): GateQuestion {
  const a = 4 + Math.floor(random() * 6);
  const b = 4 + Math.floor(random() * 6);
  return { a, b, answer: a * b };
}

export function gatePasses(q: GateQuestion, typed: string): boolean {
  const n = Number.parseInt(typed.replace(/\D/g, ''), 10);
  return n === q.answer;
}
