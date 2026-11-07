import { addDays, diffDays } from './dates';

/**
 * Leitner-style spaced repetition. Each phrase sits in a box 1–6;
 * a right answer moves it up (longer gap), a wrong one sends it back to box 1.
 */
export interface SrsCard {
  box: number;
  due: string;
  right: number;
  wrong: number;
}

export const INTERVALS = [0, 0, 1, 2, 4, 8, 16];
export const MAX_BOX = 6;

export function introduce(card: SrsCard | undefined, today: string): SrsCard {
  return card ?? { box: 1, due: addDays(today, 1), right: 0, wrong: 0 };
}

export function grade(card: SrsCard | undefined, correct: boolean, today: string): SrsCard {
  const c = card ?? { box: 1, due: today, right: 0, wrong: 0 };
  if (correct) {
    const box = Math.min(c.box + 1, MAX_BOX);
    return { box, due: addDays(today, INTERVALS[box]), right: c.right + 1, wrong: c.wrong };
  }
  return { box: 1, due: today, right: c.right, wrong: c.wrong + 1 };
}

/** Phrases due for review, most overdue and weakest first. */
export function dueIds(cards: Record<string, SrsCard>, today: string, limit = 8): string[] {
  return Object.entries(cards)
    .filter(([, c]) => diffDays(c.due, today) >= 0)
    .sort(([, a], [, b]) => a.due.localeCompare(b.due) || a.box - b.box)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Weakest learned phrases, used when nothing is due. */
export function weakestIds(cards: Record<string, SrsCard>, limit = 8): string[] {
  return Object.entries(cards)
    .sort(([, a], [, b]) => a.box - b.box || b.wrong - a.wrong || a.due.localeCompare(b.due))
    .slice(0, limit)
    .map(([id]) => id);
}

/** 0–1 strength, for the phrasebook's little meter. */
export function strength(card: SrsCard | undefined): number {
  if (!card) return 0;
  return card.box / MAX_BOX;
}
