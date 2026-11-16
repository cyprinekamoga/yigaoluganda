import { describe, expect, it } from 'vitest';
import { gatePasses, gateQuestion, numberWord } from './gate';

describe('grown-up check', () => {
  it('asks a two-digit times question', () => {
    for (const r of [0, 0.2, 0.5, 0.99]) {
      const q = gateQuestion(() => r);
      expect(q.a).toBeGreaterThanOrEqual(4);
      expect(q.a).toBeLessThanOrEqual(9);
      expect(q.answer).toBe(q.a * q.b);
      expect(q.answer).toBeGreaterThanOrEqual(16);
    }
  });

  it('writes the numbers as words in the app language', () => {
    expect(numberWord(7, 'en')).toBe('seven');
    expect(numberWord(8, 'sv')).toBe('åtta');
  });

  it('accepts only the right answer, ignoring spaces', () => {
    const q = { a: 7, b: 8, answer: 56 };
    expect(gatePasses(q, '56')).toBe(true);
    expect(gatePasses(q, ' 5 6 ')).toBe(true);
    expect(gatePasses(q, '54')).toBe(false);
    expect(gatePasses(q, '')).toBe(false);
  });
});
