/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRY_CURRENCY, MONTHLY_NET, TAX_COLLECTED, formatMoney, priceLine, quote } from './pricing';

const ROOT = path.resolve(import.meta.dirname, '../..');

describe('pricing', () => {
  it('charges €3.99 + VAT in the euro area', () => {
    expect(quote('DE')).toMatchObject({ currency: 'EUR', net: 399, tax: 76, total: 475, taxRate: 19 });
    expect(quote('nl')).toMatchObject({ currency: 'EUR', total: 483 });
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
    for (const copy of ['netlify/lib/pricing.ts', 'landing/netlify/lib/pricing.ts']) {
      expect(readFileSync(path.join(ROOT, copy), 'utf8'), copy).toBe(source);
    }
  });
});
