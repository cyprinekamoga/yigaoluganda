import { describe, expect, it } from 'vitest';
import { LESSONS, PHRASES, UNIT_1 } from '../content';
import { addDays, diffDays } from './dates';
import { buildLesson, choiceStep, type Step } from './generator';
import { HEART_REGEN_MS, MAX_HEARTS, initialStats, lessonReward, loseHeart, nextHeartIn, recordActivity, regenHearts, visibleStreak, buyRefill, REFILL_COST } from './progress';
import { makeRng } from './rng';
import { lengthVariants, spellingDistractors } from './spelling';
import { dueIds, grade, introduce } from './srs';
import { normalize, sameText, tilesOf } from './text';
import { tileStatus, isAvailable } from './unlock';

const ctx = { lang: 'en' as const, name: 'Alex', hasAudio: () => false };

describe('text', () => {
  it("treats ng' as ŋ and ignores case and punctuation", () => {
    expect(sameText("Ng'ng'enda e Kampala.", 'ŋŋenda e kampala')).toBe(true);
    expect(sameText('Oli otya?', 'oli otya')).toBe(true);
  });
  it('never collapses doubled letters', () => {
    expect(sameText('okusiba', 'okusiiba')).toBe(false);
    expect(normalize('Weebale')).toBe('weebale');
  });
  it('splits sentences into tiles and fills the name', () => {
    expect(tilesOf('Erinnya lyange nze {name}.', 'Sara')).toEqual(['erinnya', 'lyange', 'nze', 'Sara']);
    expect(tilesOf('Mmanyi Oluganda katono.', 'x')).toEqual(['mmanyi', 'Oluganda', 'katono']);
  });
});

describe('spelling distractors', () => {
  it('makes length-only misspellings', () => {
    const v = lengthVariants('weebale');
    expect(v).toContain('webale');
    expect(v).toContain('weebbale');
    expect(v).not.toContain('weebale');
  });
  it('never offers a real word as a misspelling', () => {
    const real = new Set(Object.values(PHRASES).map((p) => normalize(p.lg)));
    for (let seed = 1; seed < 30; seed++) {
      const d = spellingDistractors('okusiba', real, makeRng(seed), 3);
      expect(d.map(normalize)).not.toContain('okusiiba');
    }
  });
  it('always gives at least two options, even for very short words', () => {
    for (const id of ['ye', 'bo', 'wa', 'yee']) {
      const step = choiceStep(id, ctx, makeRng(1), ['ffe', 'nze', 'ggwe']) as Extract<Step, { kind: 'choice' }>;
      expect(step.options.length).toBeGreaterThanOrEqual(2);
      expect(step.options).toContain(step.answer);
    }
  });
});

describe('lesson generator', () => {
  const ref = LESSONS['c02-l2'];
  it('is deterministic for the same seed', () => {
    expect(buildLesson(ref, ctx)).toEqual(buildLesson(ref, ctx));
  });
  it('introduces each new phrase before testing it', () => {
    const steps = buildLesson(ref, ctx);
    for (const id of ref.lesson.phrases) {
      const intro = steps.findIndex((s) => s.kind === 'intro' && s.phraseId === id);
      const test = steps.findIndex((s) => (s.kind === 'choice' && s.phraseId === id) || (s.kind === 'match' && s.phraseIds.includes(id)));
      expect(intro).toBeGreaterThanOrEqual(0);
      if (test >= 0) expect(intro).toBeLessThan(test);
    }
  });
  it('introduces review phrases the learner has not met yet', () => {
    const known = new Set<string>();
    const steps = buildLesson(LESSONS['c05-l1'], { ...ctx, known: (id) => known.has(id) });
    expect(steps.some((s) => s.kind === 'intro' && s.phraseId === 'kale')).toBe(true);
    const steps2 = buildLesson(LESSONS['c05-l1'], { ...ctx, known: () => true });
    expect(steps2.some((s) => s.kind === 'intro' && s.phraseId === 'kale')).toBe(false);
  });
  it('ends with the roleplay and skips audio exercises without recordings', () => {
    const steps = buildLesson(ref, ctx);
    expect(steps[steps.length - 1]).toEqual({ kind: 'dialogue', dialogueId: 'dlg-tea' });
    expect(steps.some((s) => s.kind === 'dictation' || s.kind === 'speak')).toBe(false);
  });
  it('adds listening, dictation and speaking when recordings exist', () => {
    const steps = buildLesson(ref, { ...ctx, hasAudio: () => true });
    expect(steps.some((s) => s.kind === 'choice' && s.mode === 'listen')).toBe(true);
    expect(steps.some((s) => s.kind === 'dictation')).toBe(true);
    expect(steps.some((s) => s.kind === 'speak')).toBe(true);
  });
  it('builds word banks whose tiles contain the answer', () => {
    for (const r of Object.values(LESSONS)) {
      for (const s of buildLesson(r, ctx)) {
        if (s.kind !== 'build') continue;
        for (const t of s.answer) expect(s.tiles).toContain(t);
        expect(s.tiles.length).toBeGreaterThan(s.answer.length);
      }
    }
  });
});

describe('water pots, cowries and drumbeat', () => {
  const t0 = 1_000_000;
  it('loses a heart and grows it back after 20 minutes', () => {
    let s = initialStats(t0);
    s = loseHeart(s, t0);
    expect(s.hearts).toBe(MAX_HEARTS - 1);
    expect(nextHeartIn(s, t0)).toBe(HEART_REGEN_MS);
    expect(regenHearts(s, t0 + HEART_REGEN_MS).hearts).toBe(MAX_HEARTS);
  });
  it('never goes below zero hearts', () => {
    let s = initialStats(t0);
    for (let i = 0; i < 9; i++) s = loseHeart(s, t0);
    expect(s.hearts).toBe(0);
  });
  it('refills hearts with gems only when there are enough', () => {
    const s = { ...initialStats(t0), hearts: 0 };
    expect(buyRefill(s, t0)).toBeNull();
    const r = buyRefill({ ...s, gems: REFILL_COST + 1 }, t0)!;
    expect(r.hearts).toBe(MAX_HEARTS);
    expect(r.gems).toBe(1);
  });
  it('beats the drum on consecutive days and goes quiet after a gap', () => {
    const d1 = '2026-11-01';
    let s = recordActivity(initialStats(t0), d1, 5);
    s = recordActivity(s, d1, 5);
    expect(s.streak).toBe(1);
    s = recordActivity(s, addDays(d1, 1), 5);
    expect(s.streak).toBe(2);
    expect(visibleStreak(s, addDays(d1, 2))).toBe(2);
    expect(visibleStreak(s, addDays(d1, 3))).toBe(0);
    s = recordActivity(s, addDays(d1, 4), 5);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
    expect(s.gems).toBe(20);
    expect(s.activityByDay[d1]).toBe(2);
    expect(s.activityByDay[addDays(d1, 1)]).toBe(1);
  });
  it('rewards lessons with cowries, more for a lesson with no mistakes', () => {
    expect(lessonReward(false).gems).toBe(5);
    expect(lessonReward(true).gems).toBe(10);
  });
  it('handles month boundaries', () => {
    expect(diffDays('2026-01-31', '2026-02-01')).toBe(1);
  });
});

describe('spaced repetition', () => {
  it('moves right answers up and wrong ones back to box 1', () => {
    const today = '2026-11-07';
    let c = introduce(undefined, today);
    c = grade(c, true, today);
    expect(c.box).toBe(2);
    c = grade(c, false, today);
    expect(c.box).toBe(1);
    expect(dueIds({ a: c, b: { box: 3, due: addDays(today, 3), right: 2, wrong: 0 } }, today)).toEqual(['a']);
  });
});

describe('non-linear unlocking', () => {
  const chapters = UNIT_1.chapters;
  const view = (done: Record<string, true>, opened: Record<string, true> = {}, last: string | null = null) => ({ done, opened, lastChapterId: last });
  const finish = (...ids: string[]) =>
    Object.fromEntries(ids.flatMap((id) => chapters.find((c) => c.id === id)!.lessons.map((l) => [l.id, true]))) as Record<string, true>;

  it('opens three chapters at the start', () => {
    const s = chapters.map((c) => tileStatus(UNIT_1, c, view({})));
    expect(s.slice(0, 3)).toEqual(['ready', 'ready', 'ready']);
    expect(s.slice(3)).toEqual(Array(9).fill('locked'));
  });
  it('opens the next locked chapter for each one completed, in any order', () => {
    const done = finish('c03');
    expect(tileStatus(UNIT_1, chapters[2], view(done))).toBe('completed');
    expect(tileStatus(UNIT_1, chapters[3], view(done))).toBe('unlocked');
    expect(tileStatus(UNIT_1, chapters[3], view(done, { c04: true }))).toBe('ready');
    expect(tileStatus(UNIT_1, chapters[4], view(done))).toBe('locked');
  });
  it('marks the chapter in progress as active and others as unfinished', () => {
    const done = { 'c01-l1': true, 'c02-l1': true } as Record<string, true>;
    expect(tileStatus(UNIT_1, chapters[0], view(done, {}, 'c01'))).toBe('active');
    expect(tileStatus(UNIT_1, chapters[1], view(done, {}, 'c01'))).toBe('unfinished');
  });
  it('opens the checkpoint only when chapters 1–11 are complete', () => {
    const ids = chapters.slice(0, 11).map((c) => c.id);
    expect(isAvailable(UNIT_1, chapters[11], finish(...ids.slice(0, 10)))).toBe(false);
    expect(isAvailable(UNIT_1, chapters[11], finish(...ids))).toBe(true);
  });
});
