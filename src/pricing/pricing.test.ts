/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRY_CURRENCY, MONTHLY_NET, TAX_COLLECTED, formatMoney, priceLine, quote } from './pricing';

const ROOT = path.resolve(import.meta.dirname, '../..');

describe('pricing', () => {
  it('charges €3.99 + Swedish VAT (25%) everywhere in the EU', () => {
    expect(quote('DE')).toMatchObject({ currency: 'EUR', net: 399, tax: 100, total: 499, taxRate: 25 });
    expect(quote('nl')).toMatchObject({ currency: 'EUR', total: 499 });
    expect(quote('PL')).toMatchObject({ currency: 'PLN', taxRate: 25 });
  });

  it('shows Swedish customers kronor including 25% moms', () => {
    const q = quote('SE');
    expect(q).toMatchObject({ currency: 'SEK', net: 4400, tax: 1100, total: 5500, taxRate: 25 });
    expect(priceLine(q, 'sv')).toMatch(/55,00\s*kr\/månad inkl\. moms/);
  });

  it('charges the net price where no tax is collected', () => {
    expect(quote('GB')).toMatchObject({ currency: 'GBP', tax: 0, total: 349, taxRate: null });
    expect(priceLine(quote('GB'), 'en')).toBe('£3.49 / month');
    expect(quote('US')).toMatchObject({ currency: 'USD', total: 449 });
  });

  it('falls back to euros, without VAT, for unknown or other countries', () => {
    expect(quote('')).toMatchObject({ currency: 'EUR', total: 399, taxRate: null });
    expect(quote('JP')).toMatchObject({ currency: 'EUR', total: 399 });
    expect(quote(undefined).currency).toBe('EUR');
  });

  it('formats zero-decimal currencies without decimals', () => {
    expect(formatMoney(quote('UG').total, 'UGX', 'en-GB')).toMatch(/16,900/);
  });

  it('has a price for every currency a country maps to, and VAT for every EU country', () => {
    for (const cur of Object.values(COUNTRY_CURRENCY)) expect(MONTHLY_NET[cur]).toBeGreaterThan(0);
    expect(Object.keys(TAX_COLLECTED)).toHaveLength(27);
  });

  it('keeps the edge-function copies in sync (run `npm run sites:sync`)', () => {
    const source = readFileSync(path.join(ROOT, 'src/pricing/pricing.ts'), 'utf8');
    for (const copy of ['netlify/lib/pricing.ts', 'landing/netlify/lib/pricing.ts', 'supabase/functions/_shared/pricing.ts']) {
      expect(readFileSync(path.join(ROOT, copy), 'utf8'), copy).toBe(source);
    }
  });
});

describe('plans', () => {
  it('every plan has a price in every currency', async () => {
    const { PLAN_NET, PLANS, MONTHLY_NET } = await import('./pricing');
    for (const plan of PLANS) for (const cur of Object.keys(MONTHLY_NET)) expect(PLAN_NET[plan][cur as keyof typeof MONTHLY_NET], `${plan} ${cur}`).toBeGreaterThan(0);
  });

  it('shows the approved prices', async () => {
    const { quote } = await import('./pricing');
    expect(quote('SE', 'yearly').total).toBe(49900);
    expect(quote('SE', 'family_monthly').total).toBe(8900);
    expect(quote('SE', 'family_yearly').total).toBe(79900);
    expect(quote('DE', 'yearly').total).toBe(4499);
    expect(quote('DE', 'family_monthly').total).toBe(799);
    expect(quote('DE', 'family_yearly').total).toBe(6999);
    expect(quote('US', 'yearly').total).toBe(3999);
    expect(quote('US', 'family_monthly').total).toBe(749);
    expect(quote('US', 'family_yearly').total).toBe(6699);
  });

  it('yearly saves about three months, and Family costs less than two single plans', async () => {
    const { PLAN_NET, MONTHLY_NET } = await import('./pricing');
    for (const cur of Object.keys(MONTHLY_NET) as (keyof typeof MONTHLY_NET)[]) {
      const m = MONTHLY_NET[cur];
      expect(PLAN_NET.yearly[cur] / m, cur).toBeGreaterThan(8.5);
      expect(PLAN_NET.yearly[cur] / m, cur).toBeLessThan(9.5);
      expect(PLAN_NET.family_monthly[cur] / m, cur).toBeLessThan(2);
      expect(PLAN_NET.family_yearly[cur] / PLAN_NET.family_monthly[cur], cur).toBeLessThan(9.5);
    }
  });

  it('writes the period', async () => {
    const { priceLine, quote } = await import('./pricing');
    expect(priceLine(quote('SE', 'yearly'), 'sv', 'year')).toMatch(/499,00\s?kr\/år inkl\. moms/);
    expect(priceLine(quote('US', 'yearly'), 'en', 'year')).toBe('$39.99 / year');
  });
});
