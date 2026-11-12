// POST /create-checkout { lang } → { url } of a Stripe Checkout page for the monthly plan.
// Stripe picks the customer's local currency from the price's currency options and adds VAT
// (Stripe Tax). The customer must accept the terms, which explain the 14-day right of withdrawal.
import { callingUser, customerFor, stripe, admin } from '../_shared/clients.ts';
import { appUrl, cors, env, json, siteUrl } from '../_shared/http.ts';

const ACTIVE = ['active', 'trialing', 'past_due'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await callingUser(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);
  const { lang } = await req.json().catch(() => ({ lang: 'en' }));
  const sv = lang === 'sv';

  const { data: subs } = await admin.from('subscriptions').select('status').eq('user_id', user.id);
  if (subs?.some((s) => ACTIVE.includes(s.status))) return json({ error: 'already_subscribed' }, 409);

  const terms = sv ? `${siteUrl()}/sv/villkor/` : `${siteUrl()}/terms/`;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: await customerFor(user),
    client_reference_id: user.id,
    line_items: [{ price: env('STRIPE_PRICE_ID'), quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    automatic_tax: { enabled: true },
    customer_update: { address: 'auto', name: 'auto' },
    billing_address_collection: 'auto',
    consent_collection: { terms_of_service: 'required' },
    custom_text: {
      terms_of_service_acceptance: {
        message: sv
          ? `Jag godkänner [villkoren](${terms}) och vill få tillgång direkt. Jag kan frånträda avtalet inom 14 dagar och får då hela beloppet tillbaka.`
          : `I agree to the [terms](${terms}) and want access straight away. I can withdraw within 14 days and get a full refund.`,
      },
    },
    locale: sv ? 'sv' : 'en',
    success_url: `${appUrl()}/subscribe?status=success`,
    cancel_url: `${appUrl()}/subscribe?status=cancelled`,
  });
  return json({ url: session.url });
});
