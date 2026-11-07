import type { Chapter, Dialogue, Lesson, Phrase, Root, Sentence, SoundPair, Tip, Unit } from './types';

import chapters from '../../content/unit-1/chapters.json';
import phrases from '../../content/unit-1/phrases.json';
import sentences from '../../content/unit-1/sentences.json';
import soundPairs from '../../content/unit-1/sound-pairs.json';
import tips from '../../content/unit-1/tips.json';
import dialogues from '../../content/unit-1/dialogues.json';
import roots from '../../content/unit-1/roots.json';

export * from './types';

export const UNIT_1: Unit = {
  id: 'unit-1',
  n: 1,
  lgTitle: '',
  title: { en: 'Absolute Foundations', sv: 'Grunderna' },
  chapters: chapters as unknown as Chapter[],
  phrases: phrases as unknown as Phrase[],
  sentences: sentences as unknown as Sentence[],
  soundPairs: soundPairs as unknown as SoundPair[],
  tips: tips as unknown as Tip[],
  dialogues: dialogues as unknown as Dialogue[],
  roots: roots as unknown as Root[],
};

export const UNITS: Unit[] = [UNIT_1];

function indexBy<V extends { id: string }>(items: V[]): Record<string, V> {
  const out: Record<string, V> = {};
  for (const item of items) out[item.id] = item;
  return out;
}

const all = <K extends keyof Unit>(key: K) => UNITS.flatMap((u) => u[key] as unknown as { id: string }[]);

export const PHRASES = indexBy(all('phrases') as Phrase[]);
export const SENTENCES = indexBy(all('sentences') as Sentence[]);
export const SOUND_PAIRS = indexBy(all('soundPairs') as SoundPair[]);
export const TIPS = indexBy(all('tips') as Tip[]);
export const DIALOGUES = indexBy(all('dialogues') as Dialogue[]);
export const CHAPTERS = indexBy(all('chapters') as Chapter[]);
export const ROOTS = all('roots') as Root[];

export interface LessonRef {
  lesson: Lesson;
  chapter: Chapter;
  unit: Unit;
  index: number;
}

export const LESSONS: Record<string, LessonRef> = {};
for (const unit of UNITS) {
  for (const chapter of unit.chapters) {
    chapter.lessons.forEach((lesson, index) => {
      LESSONS[lesson.id] = { lesson, chapter, unit, index };
    });
  }
}

/** The chapter and lesson that first teaches each phrase. */
export const TAUGHT_IN: Record<string, { chapterId: string; lessonId: string }> = {};
for (const ref of Object.values(LESSONS)) {
  for (const id of ref.lesson.phrases) {
    if (!TAUGHT_IN[id]) TAUGHT_IN[id] = { chapterId: ref.chapter.id, lessonId: ref.lesson.id };
  }
}

export function chapterPhraseIds(chapter: Chapter): string[] {
  return chapter.lessons.flatMap((l) => l.phrases);
}
