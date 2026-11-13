import { UNITS, unitOf, type Chapter, type Unit } from '../content';
import { isAvailable, isUnitOpen, tileStatus, type ProgressView, type TileStatus } from './unlock';

/** Unlock rules applied to the whole course (every part), for screens. */

export function unitOpen(unit: Unit, done: ProgressView['done']): boolean {
  return isUnitOpen(UNITS, unit, done);
}

export function chapterAvailable(chapter: Chapter, done: ProgressView['done']): boolean {
  const unit = unitOf(chapter);
  return isAvailable(unit, chapter, done, unitOpen(unit, done));
}

export function chapterStatus(chapter: Chapter, view: ProgressView): TileStatus {
  const unit = unitOf(chapter);
  return tileStatus(unit, chapter, view, unitOpen(unit, view.done));
}

/** Why a locked chapter is locked, as an i18n key. */
export function lockedReason(chapter: Chapter, done: ProgressView['done']): 'chapter.lockedPart' | 'chapter.lockedCheckpoint' | 'chapter.lockedBody' {
  if (!unitOpen(unitOf(chapter), done)) return 'chapter.lockedPart';
  return chapter.checkpoint ? 'chapter.lockedCheckpoint' : 'chapter.lockedBody';
}
