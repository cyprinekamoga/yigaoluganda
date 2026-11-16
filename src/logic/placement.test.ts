import { describe, expect, it } from 'vitest';
import { PHRASES, UNIT_1 } from '../content';
import { answer, chaptersToSkip, questionFor, START, stop, TESTED, type PlacementState } from './placement';

const run = (answers: boolean[]): PlacementState => answers.reduce((s, a) => answer(s, a), START);

describe('placement test', () => {
  it('asks about every chapter that teaches phrases, in order, but not the final conversations', () => {
    expect(TESTED[0].id).toBe(UNIT_1.chapters[0].id);
    expect(TESTED.map((c) => c.id)).not.toContain('c12');
    expect(TESTED.map((c) => c.id)).not.toContain('c21');
    expect(TESTED).toHaveLength(20);
  });

  it('builds fair questions: three different options, one of them right', () => {
    for (let index = 0; index < TESTED.length; index++) {
      for (const attempt of [0, 1]) {
        for (const lang of ['en', 'sv'] as const) {
          const q = questionFor({ index, attempt, passed: [], finished: false }, lang);
          expect(q.options).toHaveLength(3);
          expect(q.options).toContain(q.phraseId);
          const shown = q.options.map((id) => (q.mode === 'toLg' ? PHRASES[id].lg : PHRASES[id].tr[lang]));
          expect(new Set(shown).size, `${q.chapterId} ${attempt}`).toBe(3);
        }
      }
    }
  });

  it('gives a second chance on the same chapter, and stops after two misses', () => {
    const [first, second] = TESTED.map((c) => c.id);
    let s = run([true]);
    expect(s.passed).toEqual([first]);
    s = answer(s, false);
    expect(s).toMatchObject({ index: 1, attempt: 1, finished: false });
    expect(questionFor(s, 'en').chapterId).toBe(second);
    s = answer(s, true);
    expect(s.passed).toEqual([first, second]);
    s = answer(answer(s, false), false);
    expect(s.finished).toBe(true);
    expect(s.passed).toEqual([first, second]);
  });

  it('a beginner skips nothing', () => {
    const s = run([false, false]);
    expect(s.finished).toBe(true);
    expect(chaptersToSkip(s.passed)).toEqual([]);
  });

  it('knowing all of Part 1 also completes its final conversation, which opens Part 2', () => {
    const regular = UNIT_1.chapters.filter((c) => !c.checkpoint);
    const s = run(Array(regular.length).fill(true));
    expect(s.passed).toHaveLength(regular.length);
    const skip = chaptersToSkip(s.passed);
    expect(skip).toContain(regular[regular.length - 1].id);
    expect(skip).toContain('c12');
    expect(skip).not.toContain('c13');
  });

  it('can be stopped at any time, keeping what was passed', () => {
    const s = stop(run([true, true, true]));
    expect(s.finished).toBe(true);
    expect(chaptersToSkip(s.passed)).toEqual(TESTED.slice(0, 3).map((c) => c.id));
  });

  it('finishes after the last chapter when everything is known', () => {
    const s = run(Array(TESTED.length).fill(true));
    expect(s.finished).toBe(true);
    expect(chaptersToSkip(s.passed)).toContain('c21');
  });
});
