/**
 * The one subscription price, in local currencies, and how to show it.
 *
 * This file is the single source of truth. `npm run sites:sync` copies it to the Netlify
 * edge functions (landing page and app), and `npm run stripe:setup` creates the Stripe price
 * from it. Keep it plain TypeScript with no imports so Node, Deno and the app can all run it.
 *
 * Prices are NET (excluding VAT). Stripe Tax adds VAT at checkout in the countries listed in
 * TAX_COLLECTED, so the landing page and the paywall show those prices including VAT, as EU
 * consumer law requires. Elsewhere Stripe charges the net price only.
 */

export type Currency = 'EUR' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK' | 'HUF' | 'RON' | 'GBP' | 'CHF' | 'USD' | 'CAD' | 'AUD' | 'UGX' | 'KES' | 'ZAR';

export const DEFAULT_CURRENCY: Currency = 'EUR';

/**
 * Monthly price excluding VAT, in the currency's smallest unit (cents, öre, …).
 * EUR 3.99 is the base. The others are rounded local equivalents, set from approximate
 * exchange rates in late 2026: check them before launch and whenever rates move a lot.
 */
export const MONTHLY_NET: Record<Currency, number> = {
  EUR: 399,
  SEK: 4400,
  NOK: 4600,
  DKK: 2975,
  PLN: 1699,
  CZK: 9900,
  HUF: 159000,
  RON: 1999,
  GBP: 349,
  CHF: 375,
  USD: 449,
  CAD: 649,
  AUD: 699,
  UGX: 16900,
  KES: 59900,
  ZAR: 7900,
};

/** The plans. Family is for up to FAMILY_SIZE people (adults with their own login and children's profiles). */
export type Plan = 'monthly' | 'yearly' | 'family_monthly' | 'family_yearly';
export const PLANS: Plan[] = ['monthly', 'yearly', 'family_monthly', 'family_yearly'];
export const FAMILY_SIZE = 6;
export const isFamilyPlan = (plan: Plan | string | null | undefined): boolean => plan === 'family_monthly' || plan === 'family_yearly';
export const isYearlyPlan = (plan: Plan | string | null | undefined): boolean => plan === 'yearly' || plan === 'family_yearly';
/** Stripe lookup keys, so the Edge Functions find each price by name. */
export const PLAN_LOOKUP_KEY: Record<Plan, string> = {
  monthly: 'yiga-oluganda-monthly',
  yearly: 'yiga-oluganda-yearly',
  family_monthly: 'yiga-oluganda-family-monthly',
  family_yearly: 'yiga-oluganda-family-yearly',
};

/**
 * Every plan's price excluding VAT, in the smallest unit. Shown prices (with VAT in the EU) are
 * round: yearly is 9 × monthly (three months free), Family about 1.6 × monthly, and Family yearly
 * 9 × Family monthly. Set from the same approximate exchange rates as MONTHLY_NET.
 */
export const PLAN_NET: Record<Plan, Record<Currency, number>> = {
  monthly: MONTHLY_NET,
  yearly: {
    EUR: 3599, SEK: 39920, NOK: 40900, DKK: 27120, PLN: 15279, CZK: 88720, HUF: 1431200, RON: 17999,
    GBP: 3099, CHF: 3399, USD: 3999, CAD: 5799, AUD: 6299, UGX: 149000, KES: 539900, ZAR: 70900,
  },
  family_monthly: {
    EUR: 639, SEK: 7120, NOK: 6900, DKK: 4720, PLN: 2719, CZK: 15920, HUF: 255200, RON: 3199,
    GBP: 599, CHF: 599, USD: 749, CAD: 999, AUD: 1099, UGX: 29000, KES: 99900, ZAR: 12900,
  },
  family_yearly: {
    EUR: 5599, SEK: 63920, NOK: 61900, DKK: 42320, PLN: 24479, CZK: 143120, HUF: 2295200, RON: 28799,
    GBP: 5399, CHF: 5399, USD: 6699, CAD: 8999, AUD: 9899, UGX: 259000, KES: 899900, ZAR: 115900,
  },
};

/** Currencies with no minor unit in Stripe's API (amounts are whole units). */
export const ZERO_DECIMAL: ReadonlySet<Currency> = new Set<Currency>(['UGX']);

/** Which currency each country pays in. Countries not listed pay in euros. */
export const COUNTRY_CURRENCY: Record<string, Currency> = {
  // Euro area (Bulgaria joined on 1 January 2026) and countries that use the euro
  AT: 'EUR', BE: 'EUR', BG: 'EUR', HR: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR', DE: 'EUR', GR: 'EUR',
  IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR',
  ES: 'EUR', AD: 'EUR', MC: 'EUR', SM: 'EUR', VA: 'EUR', ME: 'EUR', XK: 'EUR',
  SE: 'SEK',
  NO: 'NOK', SJ: 'NOK',
  DK: 'DKK', GL: 'DKK', FO: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  GB: 'GBP', IM: 'GBP', JE: 'GBP', GG: 'GBP',
  CH: 'CHF', LI: 'CHF',
  US: 'USD', PR: 'USD', GU: 'USD', VI: 'USD', AS: 'USD', MP: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  UG: 'UGX',
  KE: 'KES',
  ZA: 'ZAR',
};

/**
 * VAT is Swedish VAT (25%) for every customer in the EU. The company is VAT-registered in Sweden
 * and, while its sales to other EU countries stay under EUR 10,000 a year, may charge Swedish VAT
 * to all EU consumers (Stripe Tax: Swedish registration with the "small seller" scheme).
 * If the company registers for the EU One-Stop Shop later, give each EU country its own rate here
 * and switch the Stripe Tax registration to OSS.
 * To collect tax outside the EU (e.g. the UK or Norway), register there, turn it on in Stripe Tax,
 * and add the country here.
 */
export const HOME_VAT = 25;
const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
export const TAX_COLLECTED: Record<string, number> = Object.fromEntries(EU.map((cc) => [cc, HOME_VAT]));

export interface Quote {
  /** ISO 3166 country code, upper case, or '' when unknown. */
  country: string;
  currency: Currency;
  /** Smallest currency unit, excluding tax. */
  net: number;
  /** Tax in the smallest unit (0 where no tax is collected). */
  tax: number;
  /** What the customer pays each month, in the smallest unit. */
  total: number;
  /** VAT percent included in `total`, or null when no tax is collected. */
  taxRate: number | null;
}

/** A plan's price (monthly by default) for a visitor from `country` (ISO code, any case). */
export function quote(country?: string | null, plan: Plan = 'monthly'): Quote {
  const cc = (country ?? '').trim().toUpperCase();
  const currency = COUNTRY_CURRENCY[cc] ?? DEFAULT_CURRENCY;
  const net = PLAN_NET[plan][currency];
  const rate = cc in TAX_COLLECTED ? TAX_COLLECTED[cc] : null;
  // Stripe rounds the tax to the nearest minor unit (whole units for zero-decimal currencies).
  const tax = rate === null ? 0 : Math.round((net * rate) / 100);
  return { country: cc, currency, net, tax, total: net + tax, taxRate: rate };
}

/** Major units, e.g. 499 → 4.99 (or 16900 → 16900 for UGX). */
export function toMajor(amount: number, currency: Currency): number {
  return ZERO_DECIMAL.has(currency) ? amount : amount / 100;
}

/** "€4.99", "55,00 kr", "£3.49"… in the given UI locale. */
export function formatMoney(amount: number, currency: Currency, locale = 'en'): string {
  const major = toMajor(amount, currency);
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // "$4.49" rather than "US$4.49": the visitor sees their own currency's usual sign.
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: whole && (ZERO_DECIMAL.has(currency) || currency === 'HUF') ? 0 : 2,
    maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
  }).format(major);
}

/** Short price line for a page: "€4.99 / month incl. VAT", "£30.99 / year"… */
export function priceLine(q: Quote, lang: 'en' | 'sv', period: 'month' | 'year' = 'month'): string {
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';
  const money = formatMoney(q.total, q.currency, locale);
  if (lang === 'sv') {
    const per = period === 'year' ? 'år' : 'månad';
    return q.taxRate !== null ? `${money}/${per} inkl. moms` : `${money}/${per}`;
  }
  return q.taxRate !== null ? `${money} / ${period} incl. VAT` : `${money} / ${period}`;
}
