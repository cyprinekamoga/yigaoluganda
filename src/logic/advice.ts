import type { Chapter } from '../content/types';

/** Ngaali's tip on the home screen. Keys map to i18n `advice.<key>`. */
export type AdviceKey = 'noHearts' | 'continue' | 'newChapter' | 'review' | 'keepStreak' | 'start' | 'allDone' | 'welcome';

export interface AdviceInput {
  hearts: number;
  streak: number;
  activeToday: boolean;
  lessonsDone: number;
  activeChapter?: Chapter;
  unlockedChapter?: Chapter;
  dueCount: number;
  allDone: boolean;
}

export interface Advice {
  key: AdviceKey;
  chapter?: Chapter;
  count?: number;
}

export function adviceFor(i: AdviceInput): Advice {
  if (i.lessonsDone === 0) return { key: 'welcome' };
  if (i.hearts <= 0) return { key: 'noHearts' };
  if (i.allDone) return { key: 'allDone' };
  if (i.streak >= 2 && !i.activeToday) return { key: 'keepStreak', count: i.streak };
  if (i.unlockedChapter) return { key: 'newChapter', chapter: i.unlockedChapter };
  if (i.dueCount >= 5) return { key: 'review', count: i.dueCount };
  if (i.activeChapter) return { key: 'continue', chapter: i.activeChapter };
  return { key: 'start' };
}
