import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Checks the colour pairs the app uses for text against WCAG AA (4.5:1 normal text, 3:1 large/UI).
const css = readFileSync(resolve(__dirname, '../src/index.css'), 'utf8')
const color = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))![1]

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('colour contrast (WCAG AA)', () => {
  const pairs: [string, string, number][] = [
    ['ink', 'mist', 4.5], ['ink', 'cloud', 4.5], ['ink-soft', 'mist', 4.5], ['ink-soft', 'cloud', 4.5],
    ['cloud', 'lake', 4.5], ['cloud', 'leaf', 4.5], ['cloud', 'crane', 4.5], ['ink', 'sun', 4.5],
    ['lake-dark', 'lake-soft', 4.5], ['leaf-dark', 'leaf-soft', 4.5], ['ink', 'sun-soft', 4.5],
    ['lake', 'mist', 4.5], ['stone', 'mist', 4.5], ['crane', 'mist', 4.5],
  ]
  for (const [fg, bg, min] of pairs)
    it(`${fg} on ${bg} ≥ ${min}:1`, () => expect(ratio(color(fg), color(bg))).toBeGreaterThanOrEqual(min))
})
