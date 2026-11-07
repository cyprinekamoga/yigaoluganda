import { describe, expect, it } from 'vitest';
import { matches } from './search';

describe('phrasebook search', () => {
  it('finds ŋ words typed with ng and without doubles', () => {
    expect(matches('ngenda', 'ŋŋenda')).toBe(true);
    expect(matches("ng'enda", 'ŋŋenda')).toBe(true);
    expect(matches('webale', 'weebale')).toBe(true);
  });
  it('searches meanings too', () => {
    expect(matches('thank', 'weebale', 'thank you')).toBe(true);
    expect(matches('xyz', 'weebale', 'thank you')).toBe(false);
  });
});
