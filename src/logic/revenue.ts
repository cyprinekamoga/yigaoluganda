import { isPlan, isYearlyPlan, MONTHLY_NET, PLAN_NET, type Currency, type Plan } from '../pricing/pricing';

export interface PlanCount {
  plan: string;
  currency: string;
  n: number;
}

/**
 * Monthly revenue before VAT, per currency, from the paying subscriptions and the price list.
 * Yearly plans count as a twelfth of their price each month. Takes the count per plan and currency
 * (paying_by_plan), or, from an older server, the count per currency (all monthly).
 */
export function monthlyRevenue(rows: PlanCount[] | Record<string, number>): { currency: Currency; amount: number }[] {
  const list: PlanCount[] = Array.isArray(rows) ? rows : Object.entries(rows).map(([currency, n]) => ({ plan: 'monthly', currency, n }));
  const sums = new Map<Currency, number>();
  for (const r of list) {
    const cur = r.currency.toUpperCase() as Currency;
    if (!(cur in MONTHLY_NET)) continue;
    const plan: Plan = isPlan(r.plan) ? r.plan : 'monthly';
    const price = PLAN_NET[plan][cur];
    const perMonth = isYearlyPlan(plan) ? price / 12 : price;
    sums.set(cur, (sums.get(cur) ?? 0) + perMonth * r.n);
  }
  return [...sums.entries()].map(([currency, amount]) => ({ currency, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount);
}

/** Paying subscriptions per plan (all currencies together), in the order of PLANS. */
export function countByPlan(rows: PlanCount[]): { plan: Plan; n: number }[] {
  const counts = new Map<Plan, number>();
  for (const r of rows) {
    const plan: Plan = isPlan(r.plan) ? r.plan : 'monthly';
    counts.set(plan, (counts.get(plan) ?? 0) + r.n);
  }
  return (['monthly', 'yearly', 'family_monthly', 'family_yearly'] as Plan[]).filter((p) => counts.has(p)).map((plan) => ({ plan, n: counts.get(plan)! }));
}
