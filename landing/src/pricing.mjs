// Generated from src/pricing/pricing.ts by npm run sites:sync. Do not edit.
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

                                                                                                                                                     

export const DEFAULT_CURRENCY           = 'EUR';

/**
 * Monthly price excluding VAT, in the currency's smallest unit (cents, öre, …).
 * EUR 3.99 is the base. The others are rounded local equivalents, set from approximate
 * exchange rates in late 2026: check them before launch and whenever rates move a lot.
 */
export const MONTHLY_NET                           = {
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

/** Currencies with no minor unit in Stripe's API (amounts are whole units). */
export const ZERO_DECIMAL                        = new Set          (['UGX']);

/** Which currency each country pays in. Countries not listed pay in euros. */
export const COUNTRY_CURRENCY                           = {
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
 * Standard VAT rates (percent) in the countries where Stripe Tax collects VAT for us:
 * the EU, through the One-Stop Shop. Digital services use the buyer's country's standard rate.
 * Stripe Tax always charges the exact rate at checkout; these are for showing the price.
 * To collect tax somewhere else (e.g. the UK or Norway), register there, turn it on in
 * Stripe Tax, and add the country here.
 */
export const TAX_COLLECTED                         = {
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, CZ: 21, DK: 25, EE: 24, FI: 25.5, FR: 20, DE: 19, GR: 24, HU: 27, IE: 23,
  IT: 22, LV: 21, LT: 21, LU: 17, MT: 18, NL: 21, PL: 23, PT: 23, RO: 21, SK: 23, SI: 22, ES: 21, SE: 25,
};

                        
                                                               
                  
                     
                                               
              
                                                                
              
                                                                 
                
                                                                           
                         
 

/** The monthly price for a visitor from `country` (ISO code, any case). */
export function quote(country                )        {
  const cc = (country ?? '').trim().toUpperCase();
  const currency = COUNTRY_CURRENCY[cc] ?? DEFAULT_CURRENCY;
  const net = MONTHLY_NET[currency];
  const rate = cc in TAX_COLLECTED ? TAX_COLLECTED[cc] : null;
  // Stripe rounds the tax to the nearest minor unit (whole units for zero-decimal currencies).
  const tax = rate === null ? 0 : Math.round((net * rate) / 100);
  return { country: cc, currency, net, tax, total: net + tax, taxRate: rate };
}

/** Major units, e.g. 499 → 4.99 (or 16900 → 16900 for UGX). */
export function toMajor(amount        , currency          )         {
  return ZERO_DECIMAL.has(currency) ? amount : amount / 100;
}

/** "€4.99", "55,00 kr", "£3.49"… in the given UI locale. */
export function formatMoney(amount        , currency          , locale = 'en')         {
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

/** Short price line for a page: "€4.99 / month incl. VAT" or "£3.49 / month". */
export function priceLine(q       , lang             )         {
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';
  const money = formatMoney(q.total, q.currency, locale);
  if (lang === 'sv') return q.taxRate !== null ? `${money}/månad inkl. moms` : `${money}/månad`;
  return q.taxRate !== null ? `${money} / month incl. VAT` : `${money} / month`;
}
