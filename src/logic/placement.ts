import { ALL_CHAPTERS, PHRASES, UNITS, unitOf, type Chapter, type Lang } from '../content';
import { hashString, makeRng, shuffle } from './rng';
import { normalize } from './text';

/**
 * "Already know some Luganda?" A short test, chapter by chapter in course order.
 * One question per chapter; a wrong answer gets a second chance with another phrase from the
 * same chapter. The test stops at the first chapter missed twice. Every chapter before that
 * counts as known, and when all of a part's chapters are known, its final conversation is too,
 * so the next part opens.
 */

/** Chapters the test asks about: every chapter that teaches phrases, except final conversations. */
export const TESTED: Chapter[] = ALL_CHAPTERS.filter((c) => !c.checkpoint && c.lessons.some((l) => l.phrases.length > 0));

export type QuestionMode = 'toLg' | 'toMeaning';

export interface PlacementQuestion {
  chapterId: string;
  /** The phrase being asked about. */
  phraseId: string;
  /** toLg: show the meaning, pick the Luganda. toMeaning: show the Luganda, pick the meaning. */
  mode: QuestionMode;
  /** Phrase ids, shuffled; one of them is phraseId. */
  options: string[];
}

export interface PlacementState {
  /** Index into TESTED of the chapter being asked about. */
  index: number;
  /** 0 for the first question about this chapter, 1 for the second chance. */
  attempt: number;
  /** Chapters answered correctly, in order. */
  passed: string[];
  finished: boolean;
}

export const START: PlacementState = { index: 0, attempt: 0, passed: [], finished: false };

const taught = (c: Chapter) => c.lessons.flatMap((l) => l.phrases).filter((id) => PHRASES[id]);

/** The question for the current step. Deterministic for a given chapter and attempt. */
export function questionFor(state: PlacementState, lang: Lang): PlacementQuestion {
  const chapter = TESTED[state.index];
  const rng = makeRng(hashString(`${chapter.id}-${state.attempt}`));
  const own = shuffle(taught(chapter), rng);
  const phraseId = own[state.attempt % own.length];
  const mode: QuestionMode = (state.index + state.attempt) % 2 === 0 ? 'toLg' : 'toMeaning';
  // Wrong options: phrases from other chapters of the same part, that look and mean something different.
  const unit = unitOf(chapter);
  const key = (id: string) => (mode === 'toLg' ? normalize(PHRASES[id].lg) : PHRASES[id].tr[lang].toLowerCase());
  const seen = new Set([key(phraseId)]);
  const pool = shuffle(
    unit.chapters.filter((c) => c !== chapter).flatMap(taught),
    rng,
  ).filter((id) => {
    const k = key(id);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const options = shuffle([phraseId, ...pool.slice(0, 2)], rng);
  return { chapterId: chapter.id, phraseId, mode, options };
}

/** Moves the test on after an answer ("I don't know" counts as wrong). */
export function answer(state: PlacementState, correct: boolean): PlacementState {
  if (state.finished) return state;
  const chapter = TESTED[state.index];
  if (correct) {
    const passed = [...state.passed, chapter.id];
    const index = state.index + 1;
    return { index, attempt: 0, passed, finished: index >= TESTED.length };
  }
  if (state.attempt === 0) return { ...state, attempt: 1 };
  return { ...state, finished: true };
}

/** Ends the test early, keeping what has been passed. */
export function stop(state: PlacementState): PlacementState {
  return { ...state, finished: true };
}

/**
 * The chapters to mark as done: the known chapters from the start of the course, plus the final
 * conversation of every part whose chapters are all known.
 */
export function chaptersToSkip(passed: string[]): string[] {
  const known = new Set(passed);
  const out: string[] = [];
  for (const unit of UNITS) {
    const regular = unit.chapters.filter((c) => TESTED.includes(c));
    for (const c of regular) if (known.has(c.id)) out.push(c.id);
    const final = unit.chapters.find((c) => c.checkpoint);
    if (final && regular.length > 0 && regular.every((c) => known.has(c.id))) out.push(final.id);
  }
  return out;
}

/** How far the test has got, for the progress beads: chapters asked about so far. */
export function progress(state: PlacementState): { done: number; total: number } {
  return { done: Math.min(state.index, TESTED.length), total: TESTED.length };
}
