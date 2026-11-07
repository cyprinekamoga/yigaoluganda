import { CHAPTERS } from '../content';
import type { Stats } from './progress';
import { isComplete } from './unlock';

export type BadgeIcon = 'feather' | 'ear' | 'heart' | 'bow' | 'chat' | 'star' | 'flame' | 'flame2' | 'bolt' | 'mic' | 'mountain' | 'crown';

export interface BadgeState {
  stats: Stats;
  done: Record<string, unknown>;
}

export interface BadgeDef {
  id: string;
  icon: BadgeIcon;
  earned: (s: BadgeState) => boolean;
}

const chapterDone = (id: string) => (s: BadgeState) => Boolean(CHAPTERS[id]) && isComplete(CHAPTERS[id], s.done);
const chaptersDone = (s: BadgeState) => Object.values(CHAPTERS).filter((c) => isComplete(c, s.done)).length;

/** Titles and descriptions live in i18n under badges.<id>. */
export const BADGES: BadgeDef[] = [
  { id: 'first-lesson', icon: 'feather', earned: (s) => Object.keys(s.done).length >= 1 },
  { id: 'sharp-ears', icon: 'ear', earned: chapterDone('c01') },
  { id: 'magic-words', icon: 'heart', earned: chapterDone('c02') },
  { id: 'respect', icon: 'bow', earned: chapterDone('c04') },
  { id: 'flawless', icon: 'star', earned: (s) => s.stats.perfectLessons >= 1 },
  { id: 'chatterbox', icon: 'chat', earned: (s) => s.stats.dialoguesDone >= 5 },
  { id: 'streak-3', icon: 'flame', earned: (s) => s.stats.bestStreak >= 3 },
  { id: 'streak-7', icon: 'flame2', earned: (s) => s.stats.bestStreak >= 7 },
  { id: 'xp-100', icon: 'bolt', earned: (s) => s.stats.xp >= 100 },
  { id: 'brave-voice', icon: 'mic', earned: (s) => s.stats.recordings >= 1 },
  { id: 'halfway', icon: 'mountain', earned: (s) => chaptersDone(s) >= 6 },
  { id: 'journey-begun', icon: 'crown', earned: chapterDone('c12') },
];

/** Badges earned now that were not earned before. */
export function newlyEarned(state: BadgeState, have: Record<string, unknown>): string[] {
  return BADGES.filter((b) => !have[b.id] && b.earned(state)).map((b) => b.id);
}
