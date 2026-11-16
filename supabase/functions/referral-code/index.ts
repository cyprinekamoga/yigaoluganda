// POST /referral-code → { code } : the signed-in learner's invite code (created the first time).
// Only for learners with an active subscription.
import { admin, callingUser } from '../_shared/clients.ts';
import { cors, json } from '../_shared/http.ts';
import { codeFor } from '../_shared/referrals.ts';

const ACTIVE = ['active', 'trialing', 'past_due'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await callingUser(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);
  const { data: subs } = await admin.from('subscriptions').select('status').eq('user_id', user.id);
  if (!subs?.some((s) => ACTIVE.includes(s.status))) return json({ error: 'no_access' }, 403);
  const { data: profile } = await admin.from('profiles').select('name').eq('id', user.id).maybeSingle();
  try {
    return json({ code: await codeFor(user.id, profile?.name ?? '') });
  } catch (e) {
    console.error(e);
    return json({ error: 'failed' }, 500);
  }
});
