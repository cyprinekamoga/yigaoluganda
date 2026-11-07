import { describe, expect, it } from 'vitest';
import { C, HUES } from './theme';

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('colour contrast (WCAG AA 4.5:1 for text)', () => {
  const pairs: [string, string, string][] = [
    ['text on page', C.ink, C.paper],
    ['text on card', C.ink, C.card],
    ['text on raised surface', C.ink, C.paperDeep],
    ['secondary text on page', C.ink2, C.paper],
    ['secondary text on card', C.ink2, C.card],
    ['muted text on page', C.ink3, C.paper],
    ['muted text on card', C.ink3, C.card],
    ['text on tomato (main button)', C.onTomato, C.tomato],
    ['maroon on neon (neon button, tags)', C.onNeon, C.neon],
    ['neon on page', C.neon, C.paper],
    ['neon on card (correct, selected tab)', C.neon, C.card],
    ['neon on neonSoft (correct panel)', C.neonDeep, C.neonSoft],
    ['light tomato on page', C.tomatoDeep, C.paper],
    ['light tomato on card', C.tomatoDeep, C.card],
    ['light tomato on tomatoSoft (wrong panel)', C.tomatoDeep, C.tomatoSoft],
    ['text on tomatoSoft', C.ink, C.tomatoSoft],
  ];
  for (const [name, fg, bg] of pairs) it(name, () => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5));
  for (const [hue, h] of Object.entries(HUES)) {
    it(`${hue}: deep text on soft and on card, and text on base`, () => {
      expect(contrast(h.deep, h.soft)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(h.deep, C.card)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(h.on, h.base)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
