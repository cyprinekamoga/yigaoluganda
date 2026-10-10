import { describe, expect, it } from 'vitest'
import { dictionaries, translate } from '.'

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]))

describe('translations', () => {
  it('sv.json and en.json have exactly the same keys', () => {
    expect(keys(dictionaries.sv).sort()).toEqual(keys(dictionaries.en).sort())
  })
  it('fills in variables', () => {
    expect(translate('sv', 'stats.streak', { n: 3 })).toBe('3 soldagar i rad')
    expect(translate('en', 'parent.gateQuestion', { a: 6, b: 7 })).toBe('What is 6 × 7?')
  })
})
