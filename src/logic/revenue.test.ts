import { describe, expect, it } from 'vitest';
import { MONTHLY_NET } from '../pricing/pricing';
import { monthlyRevenue } from './revenue';

describe('dashboard revenue', () => {
  it('multiplies paying subscriptions by the monthly price, per currency', () => {
    const r = monthlyRevenue({ USD: 2, SEK: 1, XYZ: 5 });
    expect(r).toEqual([
      { currency: 'SEK', amount: MONTHLY_NET.SEK },
      { currency: 'USD', amount: MONTHLY_NET.USD * 2 },
    ]);
  });
});
