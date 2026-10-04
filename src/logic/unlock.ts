import { allLessons, getLessonRef, story, units } from '../content'
import type { ProgressState } from './progress'

type Done = Pick<ProgressState, 'completedLessons'>

/** The first lesson is always open. Every other lesson opens when the one before it is finished. */
export function isLessonUnlocked(state: Done, lessonId: string): boolean {
  const ref = getLessonRef(lessonId)
  if (!ref) return false
  if (ref.index === 0) return true
  return Boolean(state.completedLessons[allLessons[ref.index - 1].lesson.id])
}

export function isUnitComplete(state: Done, unitId: string): boolean {
  const unit = units.find((u) => u.id === unitId)
  return Boolean(unit && unit.lessons.every((l) => state.completedLessons[l.id]))
}

/** A story chapter opens when every lesson in its unit is finished. */
export function isChapterUnlocked(state: Done, chapterId: string): boolean {
  const chapter = story.chapters.find((c) => c.id === chapterId)
  return Boolean(chapter && isUnitComplete(state, chapter.unit))
}

/** The next lesson to do, or undefined when the course is finished. */
export function nextLessonId(state: Done): string | undefined {
  return allLessons.find((r) => !state.completedLessons[r.lesson.id])?.lesson.id
}
