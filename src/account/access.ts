/** Pure rules about subscriptions. Rows mirror public.subscriptions, which Stripe keeps up to date. */
export interface SubscriptionRow {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  currency: string | null;
}

/** Statuses that unlock the course. past_due keeps access while Stripe retries the card. */
const UNLOCKS = new Set(['active', 'trialing', 'past_due']);
const DAY = 24 * 60 * 60 * 1000;
export const WITHDRAWAL_DAYS = 14;

export function hasAccess(rows: SubscriptionRow[]): boolean {
  return rows.some((r) => UNLOCKS.has(r.status));
}

/** The subscription to show: the one that unlocks the course, otherwise the newest. */
export function currentSubscription(rows: SubscriptionRow[]): SubscriptionRow | null {
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return sorted.find((r) => UNLOCKS.has(r.status)) ?? sorted[0] ?? null;
}

/** Whole days left to withdraw with a full refund (0 once the 14 days are over). */
export function withdrawalDaysLeft(sub: SubscriptionRow | null, now: number): number {
  if (!sub || !UNLOCKS.has(sub.status)) return 0;
  const end = new Date(sub.created_at).getTime() + WITHDRAWAL_DAYS * DAY;
  return Math.max(0, Math.ceil((end - now) / DAY));
}

export type SubscriptionState = 'active' | 'ending' | 'past_due' | 'none';

export function subscriptionState(sub: SubscriptionRow | null): SubscriptionState {
  if (!sub || !UNLOCKS.has(sub.status)) return 'none';
  if (sub.status === 'past_due') return 'past_due';
  return sub.cancel_at_period_end ? 'ending' : 'active';
}
