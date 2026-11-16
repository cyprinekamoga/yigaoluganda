import { describe, expect, it } from 'vitest';
import { goalJustReached, goalOf, goalProgress } from './goal';

describe('daily goal', () => {
  it('only the round that reaches the goal celebrates', () => {
    expect(goalJustReached(1, 2)).toBe(false);
    expect(goalJustReached(2, 2)).toBe(true);
    expect(goalJustReached(3, 2)).toBe(false);
  });
  it('falls back to one a day for odd values', () => {
    expect(goalOf(undefined)).toBe(1);
    expect(goalOf(7)).toBe(1);
    expect(goalOf(3)).toBe(3);
  });
  it('measures progress', () => {
    expect(goalProgress(0, 2)).toBe(0);
    expect(goalProgress(1, 2)).toBe(0.5);
    expect(goalProgress(5, 2)).toBe(1);
  });
});
