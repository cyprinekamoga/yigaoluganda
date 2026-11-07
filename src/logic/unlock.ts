import type { Chapter, Unit } from '../content/types';

/**
 * Non-linear unlocking: three chapters are open from the start, and every
 * completed chapter opens the next locked one. The checkpoint opens when
 * every other chapter in the unit is complete.
 */
export const START_OPEN = 3;

export type TileStatus = 'locked' | 'unlocked' | 'ready' | 'active' | 'unfinished' | 'completed';

export interface ProgressView {
  /** lessonId → completed */
  done: Record<string, unknown>;
  /** chapter ids the learner has opened at least once */
  opened: Record<string, unknown>;
  lastChapterId: string | null;
}

export function lessonsDone(chapter: Chapter, done: ProgressView['done']): number {
  return chapter.lessons.filter((l) => done[l.id]).length;
}

export function isComplete(chapter: Chapter, done: ProgressView['done']): boolean {
  return lessonsDone(chapter, done) === chapter.lessons.length;
}

export function isAvailable(unit: Unit, chapter: Chapter, done: ProgressView['done']): boolean {
  const regular = unit.chapters.filter((c) => !c.checkpoint);
  if (chapter.checkpoint) return regular.every((c) => isComplete(c, done));
  if (lessonsDone(chapter, done) > 0) return true;
  const completed = regular.filter((c) => isComplete(c, done)).length;
  return regular.indexOf(chapter) < START_OPEN + completed;
}

export function tileStatus(unit: Unit, chapter: Chapter, p: ProgressView): TileStatus {
  const n = lessonsDone(chapter, p.done);
  if (n === chapter.lessons.length) return 'completed';
  if (!isAvailable(unit, chapter, p.done)) return 'locked';
  if (n > 0) return chapter.id === p.lastChapterId ? 'active' : 'unfinished';
  const initial = !chapter.checkpoint && unit.chapters.filter((c) => !c.checkpoint).indexOf(chapter) < START_OPEN;
  return !initial && !p.opened[chapter.id] ? 'unlocked' : 'ready';
}

/** The next lesson to play in a chapter (first not done), or null if all are done. */
export function nextLessonIndex(chapter: Chapter, done: ProgressView['done']): number | null {
  const i = chapter.lessons.findIndex((l) => !done[l.id]);
  return i === -1 ? null : i;
}

/** Lessons inside a chapter are played in order. */
export function isLessonOpen(chapter: Chapter, index: number, done: ProgressView['done']): boolean {
  return index === 0 || Boolean(done[chapter.lessons[index - 1].id]);
}
