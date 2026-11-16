import { describe, expect, it } from 'vitest';
import { MONTHLY_NET, PLAN_NET } from '../pricing/pricing';
import { countByPlan, monthlyRevenue } from './revenue';

describe('dashboard revenue', () => {
  it('multiplies paying subscriptions by the monthly price, per currency (older servers)', () => {
    const r = monthlyRevenue({ USD: 2, SEK: 1, XYZ: 5 });
    expect(r).toEqual([
      { currency: 'SEK', amount: MONTHLY_NET.SEK },
      { currency: 'USD', amount: MONTHLY_NET.USD * 2 },
    ]);
  });

  it('counts each plan at its own price, yearly plans as a twelfth a month', () => {
    const r = monthlyRevenue([
      { plan: 'monthly', currency: 'EUR', n: 2 },
      { plan: 'yearly', currency: 'EUR', n: 1 },
      { plan: 'family_monthly', currency: 'eur', n: 1 },
      { plan: 'family_yearly', currency: 'SEK', n: 1 },
      { plan: 'monthly', currency: 'XYZ', n: 9 },
    ]);
    expect(r).toEqual([
      { currency: 'SEK', amount: Math.round(PLAN_NET.family_yearly.SEK / 12) },
      { currency: 'EUR', amount: Math.round(MONTHLY_NET.EUR * 2 + PLAN_NET.yearly.EUR / 12 + PLAN_NET.family_monthly.EUR) },
    ]);
  });

  it('counts paying subscriptions per plan', () => {
    expect(
      countByPlan([
        { plan: 'family_yearly', currency: 'EUR', n: 1 },
        { plan: 'monthly', currency: 'EUR', n: 2 },
        { plan: 'monthly', currency: 'SEK', n: 1 },
      ]),
    ).toEqual([
      { plan: 'monthly', n: 3 },
      { plan: 'family_yearly', n: 1 },
    ]);
  });
});
