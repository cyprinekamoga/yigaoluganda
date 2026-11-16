import { describe, expect, it } from 'vitest';
import { ALL_PHRASES } from '../content';
import { acceptedForms, editDistance, gradeTyped } from './typing';

describe('typed answers', () => {
  it('ignores capitals, punctuation and spaces', () => {
    expect(gradeTyped('oli otya', ['Oli otya?'])).toBe('correct');
    expect(gradeTyped('  OLI   OTYA!! ', ['Oli otya?'])).toBe('correct');
  });

  it('accepts ng’ for ŋ', () => {
    expect(gradeTyped("ng'enda", ['ŋenda'])).toBe('correct');
    expect(gradeTyped('ŋenda', ['ŋenda'])).toBe('correct');
  });

  it('a mistake in sound length is wrong, and says so', () => {
    expect(gradeTyped('webale', ['Weebale'])).toBe('length');
    expect(gradeTyped('weebbale', ['Weebale'])).toBe('length');
  });

  it('forgives one slipped letter in a longer answer', () => {
    expect(gradeTyped('weebake', ['Weebale'])).toBe('typo');
    expect(gradeTyped('oli otua', ['Oli otya?'])).toBe('typo');
  });

  it('but not in a short word, or two slips', () => {
    expect(gradeTyped('kirumgi', ['Kirungi'])).toBe('typo');
    expect(gradeTyped('nnyi', ['nnyo'])).toBe('wrong');
    expect(gradeTyped('wexbake', ['Weebale'])).toBe('wrong');
    expect(gradeTyped('', ['Weebale'])).toBe('wrong');
  });

  it('counts the listed variants', () => {
    expect(gradeTyped('ngenda', acceptedForms('ŋenda', ['ngenda']))).toBe('correct');
  });

  it('measures edit distance', () => {
    expect(editDistance('kale', 'kale')).toBe(0);
    expect(editDistance('kale', 'kala')).toBe(1);
    expect(editDistance('kale', 'kalexyz', 2)).toBe(3);
  });

  it('every phrase in the course grades its own spelling as correct', () => {
    for (const p of ALL_PHRASES) expect(gradeTyped(p.lg, acceptedForms(p.lg, p.variants)), p.id).toBe('correct');
  });
});
