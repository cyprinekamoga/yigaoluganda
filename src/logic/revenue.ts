import { MONTHLY_NET, type Currency } from '../pricing/pricing';

/** Monthly revenue before VAT, per currency, from the paying subscriptions and the price list. */
export function monthlyRevenue(byCurrency: Record<string, number>): { currency: Currency; amount: number }[] {
  return Object.entries(byCurrency)
    .filter(([cur]) => cur in MONTHLY_NET)
    .map(([cur, n]) => ({ currency: cur as Currency, amount: MONTHLY_NET[cur as Currency] * n }))
    .sort((a, b) => b.amount - a.amount);
}
