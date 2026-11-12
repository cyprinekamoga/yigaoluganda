// POST /billing-portal { lang } → { url } of Stripe's customer portal: cancel, change card, receipts.
import { callingUser, customerFor, portalConfiguration, stripe } from '../_shared/clients.ts';
import { appUrl, cors, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await callingUser(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);
  const { lang } = await req.json().catch(() => ({ lang: 'en' }));
  const session = await stripe.billingPortal.sessions.create({
    customer: await customerFor(user),
    return_url: `${appUrl()}/settings`,
    configuration: await portalConfiguration(),
    locale: lang === 'sv' ? 'sv' : 'en',
  });
  return json({ url: session.url });
});
