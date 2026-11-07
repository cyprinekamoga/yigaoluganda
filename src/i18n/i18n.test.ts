import { describe, expect, it } from 'vitest';
import { en } from './en';
import { sv } from './sv';

describe('i18n', () => {
  it('has the same placeholders in English and Swedish', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(sv[key].trim(), key).not.toBe('');
      expect(vars(sv[key]), key).toBe(vars(en[key]));
    }
  });
});
