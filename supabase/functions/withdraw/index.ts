// POST /withdraw → the EU "withdraw from contract" button, within 14 days of subscribing: ends the
// subscription now and refunds. The first time, the refund is in full; after that, only for the days
// not used (EU law allows a proportional charge when the customer asked to start straight away), so
// the right can't be used to learn for free by subscribing and withdrawing again and again.
import { admin, callingUser, customerFor, saveSubscription, stripe } from '../_shared/clients.ts';
import { cors, json } from '../_shared/http.ts';

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE = ['active', 'trialing', 'past_due', 'unpaid'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await callingUser(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);

  const { data: subs } = await admin.from('subscriptions').select('id, status, created_at').eq('user_id', user.id);
  const sub = subs?.find((s) => ACTIVE.includes(s.status));
  if (!sub) return json({ error: 'no_subscription' }, 404);
  const started = new Date(sub.created_at).getTime();
  if (Date.now() - started > 14 * DAY) return json({ error: 'too_late' }, 400);

  const { count: before } = await admin.from('withdrawals').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  const full = (before ?? 0) === 0;

  const live = await stripe.subscriptions.retrieve(sub.id);
  const item = live.items.data[0] as unknown as { current_period_start?: number; current_period_end?: number };
  const periodStart = (item?.current_period_start ?? Math.floor(started / 1000)) * 1000;
  const periodEnd = (item?.current_period_end ?? Math.floor(started / 1000) + 30 * 86400) * 1000;
  const unused = Math.min(1, Math.max(0, (periodEnd - Date.now()) / Math.max(1, periodEnd - periodStart)));

  const cancelled = await stripe.subscriptions.cancel(sub.id);
  await saveSubscription(cancelled, user.id);

  // Refund what was paid since the subscription started: all of it the first time, otherwise the
  // share of the period not used.
  const charges = await stripe.charges.list({ customer: await customerFor(user), created: { gte: Math.floor(started / 1000) - 3600 }, limit: 10 });
  let refunded = 0;
  for (const charge of charges.data) {
    if (!charge.paid || charge.refunded) continue;
    const left = charge.amount - charge.amount_refunded;
    const amount = full ? left : Math.min(left, Math.floor(charge.amount * unused));
    if (amount <= 0) continue;
    await stripe.refunds.create({ charge: charge.id, amount, reason: 'requested_by_customer' });
    refunded += amount;
  }
  await admin.from('withdrawals').insert({ user_id: user.id, subscription_id: sub.id, full_refund: full, refunded, currency: cancelled.currency });
  return json({ ok: true, refunded, currency: cancelled.currency, full });
});
