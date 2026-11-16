import { isFamilyPlan } from '../pricing/pricing';

/** Pure rules about subscriptions. Rows mirror public.subscriptions, which Stripe keeps up to date. */
export interface SubscriptionRow {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  currency: string | null;
  /** monthly, yearly, family_monthly or family_yearly (missing on rows saved by older versions). */
  plan?: string | null;
}

/** Statuses that unlock the course. past_due keeps access while Stripe retries the card. */
const UNLOCKS = new Set(['active', 'trialing', 'past_due']);
const DAY = 24 * 60 * 60 * 1000;
export const WITHDRAWAL_DAYS = 14;

/** Days a remembered subscription keeps the app open offline after its paid period has ended. */
export const OFFLINE_GRACE_DAYS = 3;

/**
 * Subscriptions remembered on the device, for when the server can't be reached. They still unlock
 * the course, but only until the paid period ends (plus a few days to get back online).
 */
export function offlineRows(rows: SubscriptionRow[], now: number): SubscriptionRow[] {
  return rows.map((r) => {
    const end = r.current_period_end ? Date.parse(r.current_period_end) : 0;
    return UNLOCKS.has(r.status) && end + OFFLINE_GRACE_DAYS * DAY < now ? { ...r, status: 'unknown_offline' } : r;
  });
}

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

/** A school's class licence (as a student or the teacher), from public.my_licence. */
export interface Licence {
  class_id: string;
  name: string;
  school: string;
  /** Last day of the licence, YYYY-MM-DD. */
  licence_until: string;
  teacher: boolean;
}

/** A class licence that still runs on `today` (YYYY-MM-DD) unlocks the course like a subscription. */
export function licenceActive(licences: Licence[], today: string): boolean {
  return licences.some((l) => l.licence_until >= today);
}

/** The account pays for a Family plan that is running: children's profiles and invites come with it. */
export function paysForFamily(rows: SubscriptionRow[]): boolean {
  return rows.some((r) => UNLOCKS.has(r.status) && isFamilyPlan(r.plan));
}

/** The caller's family, from public.my_family. */
export interface FamilyInfo {
  role: 'owner' | 'member' | null;
  /** The payer's Family plan is running. */
  active?: boolean;
  /** Owner only: the invite code, the places (6) and how many are taken (owner, members, children). */
  code?: string;
  seats?: number;
  used?: number;
  members?: { user_id: string; name: string; joined_at: string }[];
  /** Member only: the payer's first name. */
  owner_name?: string;
}

/** Someone else's running Family plan unlocks the course for its members. */
export function familyAccess(f: FamilyInfo | null): boolean {
  return f?.role === 'member' && f.active === true;
}
