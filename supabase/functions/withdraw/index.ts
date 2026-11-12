// POST /withdraw → the EU "withdraw from contract" button.
// Within 14 days of subscribing: ends the subscription now and refunds what was paid, in full.
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

  const cancelled = await stripe.subscriptions.cancel(sub.id);
  await saveSubscription(cancelled, user.id);

  // Refund every payment made since the subscription started.
  const charges = await stripe.charges.list({ customer: await customerFor(user), created: { gte: Math.floor(started / 1000) - 3600 }, limit: 10 });
  let refunded = 0;
  for (const charge of charges.data) {
    if (charge.paid && !charge.refunded && charge.amount_refunded < charge.amount) {
      await stripe.refunds.create({ charge: charge.id, reason: 'requested_by_customer' });
      refunded += charge.amount - charge.amount_refunded;
    }
  }
  return json({ ok: true, refunded, currency: cancelled.currency });
});
