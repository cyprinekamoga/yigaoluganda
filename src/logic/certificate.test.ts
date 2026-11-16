import { describe, expect, it } from 'vitest';
import { UNIT_1, UNIT_2 } from '../content';
import { certificateHtml, normalizeCode, partFinished, partPhrasesLearned, verifyUrl } from './certificate';

const allDone = (unit: typeof UNIT_1, extra: Record<string, unknown> = {}) =>
  Object.fromEntries(unit.chapters.flatMap((c) => c.lessons.map((l) => [l.id, { completedAt: 1, bestAccuracy: 1, plays: 1, ...extra }])));

describe('certificates', () => {
  it('a part is finished only when every lesson in it is done', () => {
    expect(partFinished(UNIT_1, {})).toBe(false);
    const done = allDone(UNIT_1);
    expect(partFinished(UNIT_1, done)).toBe(true);
    const missing = { ...done };
    delete missing[UNIT_1.chapters[0].lessons[0].id];
    expect(partFinished(UNIT_1, missing)).toBe(false);
    expect(partFinished(UNIT_2, done)).toBe(false);
  });

  it('chapters skipped with the placement test count, but the final conversation must be played', () => {
    const placed = allDone(UNIT_1, { placed: true });
    expect(partFinished(UNIT_1, placed)).toBe(false);
    const final = UNIT_1.chapters.find((c) => c.checkpoint)!;
    for (const l of final.lessons) placed[l.id] = { completedAt: 2, bestAccuracy: 1, plays: 1 };
    expect(partFinished(UNIT_1, placed)).toBe(true);
  });

  it('counts the part’s phrases learned', () => {
    const learned = { [UNIT_1.phrases[0].id]: {}, [UNIT_1.phrases[1].id]: {}, [UNIT_2.phrases[0].id]: {} };
    expect(partPhrasesLearned(UNIT_1, learned)).toBe(2);
  });

  it('reads a code however it was typed', () => {
    expect(normalizeCode('YO-ABCD-EFGH-JK23')).toBe('YO-ABCD-EFGH-JK23');
    expect(normalizeCode(' yo abcd efgh jk23 ')).toBe('YO-ABCD-EFGH-JK23');
    expect(normalizeCode('abcdefghjk23')).toBe('YO-ABCD-EFGH-JK23');
    expect(normalizeCode('YO-ABCD-EFGH-JK2')).toBeNull();
    // 0, 1, O and I are never used in codes.
    expect(normalizeCode('YO-ABCD-EFGH-JK10')).toBeNull();
    expect(normalizeCode('YO-OBCD-EFGH-JK23')).toBeNull();
  });

  it('links to the check page in the right language', () => {
    expect(verifyUrl('https://yigaoluganda.com', 'YO-ABCD-EFGH-JK23', 'en')).toBe('https://yigaoluganda.com/verify/?c=YO-ABCD-EFGH-JK23');
    expect(verifyUrl('https://yigaoluganda.com', 'YO-ABCD-EFGH-JK23', 'sv')).toBe('https://yigaoluganda.com/sv/verify/?c=YO-ABCD-EFGH-JK23');
  });

  it('prints a complete page with the name escaped', () => {
    const html = certificateHtml({
      lang: 'en',
      heading: 'Certificate',
      certifies: 'This certifies that',
      name: 'Ada <b>Lovelace</b>',
      completed: 'has completed Part 1',
      detail: 'of the Luganda course',
      issued: 'Issued 16 November 2026',
      codeLabel: 'Certificate code',
      code: 'YO-ABCD-EFGH-JK23',
      checkLabel: 'Check it at',
      checkUrl: 'https://yigaoluganda.com/verify/?c=YO-ABCD-EFGH-JK23',
    });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('Ada &lt;b&gt;Lovelace&lt;/b&gt;');
    expect(html).not.toContain('<b>Lovelace</b>');
    expect(html).toContain('YO-ABCD-EFGH-JK23');
    expect(html).toContain('yigaoluganda.com/verify/?c=YO-ABCD-EFGH-JK23');
    expect(html).toContain('size: A4 landscape');
  });
});
