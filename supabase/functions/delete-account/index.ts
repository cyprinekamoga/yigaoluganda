// POST /delete-account → ends any subscription (no refund) and deletes the user and their data.
// Payment records stay in Stripe, as bookkeeping law requires.
import { admin, callingUser, stripe } from '../_shared/clients.ts';
import { cors, json } from '../_shared/http.ts';

const ACTIVE = ['active', 'trialing', 'past_due', 'unpaid', 'paused'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await callingUser(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);

  const { data: subs } = await admin.from('subscriptions').select('id, status').eq('user_id', user.id);
  for (const s of subs ?? []) if (ACTIVE.includes(s.status)) await stripe.subscriptions.cancel(s.id);

  // Recordings sent for feedback live in storage, which the database cascade doesn't reach.
  const { data: files } = await admin.storage.from('recordings').list(user.id, { limit: 1000 });
  if (files?.length) await admin.storage.from('recordings').remove(files.map((f) => `${user.id}/${f.name}`));

  // Cascades to profiles, progress, child profiles, certificates, feedback, customers and subscriptions.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'delete_failed' }, 500);
  return json({ ok: true });
});
