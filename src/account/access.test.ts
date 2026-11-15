import { describe, expect, it } from 'vitest';
import { currentSubscription, hasAccess, offlineRows, subscriptionState, withdrawalDaysLeft, type SubscriptionRow } from './access';

const row = (over: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: 'sub_1',
  status: 'active',
  current_period_end: '2026-12-12T00:00:00Z',
  cancel_at_period_end: false,
  created_at: '2026-11-12T00:00:00Z',
  currency: 'sek',
  ...over,
});
const day = 24 * 60 * 60 * 1000;
const start = Date.parse('2026-11-12T00:00:00Z');

describe('subscription access', () => {
  it('unlocks while active, and while Stripe retries a failed card', () => {
    expect(hasAccess([row()])).toBe(true);
    expect(hasAccess([row({ status: 'past_due' })])).toBe(true);
    expect(hasAccess([row({ status: 'canceled' })])).toBe(false);
    expect(hasAccess([row({ status: 'incomplete' })])).toBe(false);
    expect(hasAccess([])).toBe(false);
  });

  it('shows the unlocking subscription before older ended ones', () => {
    const old = row({ id: 'old', status: 'canceled', created_at: '2026-12-01T00:00:00Z' });
    expect(currentSubscription([old, row()])?.id).toBe('sub_1');
    expect(currentSubscription([old])?.id).toBe('old');
    expect(currentSubscription([])).toBeNull();
  });

  it('counts down the 14-day withdrawal window', () => {
    expect(withdrawalDaysLeft(row(), start)).toBe(14);
    expect(withdrawalDaysLeft(row(), start + 13.5 * day)).toBe(1);
    expect(withdrawalDaysLeft(row(), start + 14 * day)).toBe(0);
    expect(withdrawalDaysLeft(row({ status: 'canceled' }), start)).toBe(0);
  });

  it('describes the state for settings', () => {
    expect(subscriptionState(row())).toBe('active');
    expect(subscriptionState(row({ cancel_at_period_end: true }))).toBe('ending');
    expect(subscriptionState(row({ status: 'past_due' }))).toBe('past_due');
    expect(subscriptionState(null)).toBe('none');
  });

  it('keeps a remembered subscription open offline only until the paid period ends (plus 3 days)', () => {
    const end = Date.parse('2026-12-12T00:00:00Z');
    expect(hasAccess(offlineRows([row()], end - day))).toBe(true);
    expect(hasAccess(offlineRows([row()], end + 2 * day))).toBe(true);
    expect(hasAccess(offlineRows([row()], end + 4 * day))).toBe(false);
    expect(hasAccess(offlineRows([row({ status: 'canceled' })], start))).toBe(false);
    expect(hasAccess(offlineRows([], start))).toBe(false);
  });
});
