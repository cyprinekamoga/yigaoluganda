// POST /create-checkout { lang } → { url } of a Stripe Checkout page for the monthly plan.
// Stripe picks the customer's local currency from the price's currency options and adds VAT
// (Stripe Tax). The customer must accept the terms, which explain the 14-day right of withdrawal.
import { admin, callingUser, customerFor, monthlyPrice, stripe } from '../_shared/clients.ts';
import { appUrl, cors, json, siteUrl } from '../_shared/http.ts';
import { promotionFor } from '../_shared/referrals.ts';

const ACTIVE = ['active', 'trialing', 'past_due'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await callingUser(req);
  if (!user) return json({ error: 'not_signed_in' }, 401);
  const { lang, ref } = await req.json().catch(() => ({ lang: 'en', ref: undefined }));
  const sv = lang === 'sv';

  const { data: subs } = await admin.from('subscriptions').select('status').eq('user_id', user.id);
  if (subs?.some((s) => ACTIVE.includes(s.status))) return json({ error: 'already_subscribed' }, 409);

  const terms = sv ? `${siteUrl()}/sv/villkor/` : `${siteUrl()}/terms/`;
  // A friend's invite code (refer a friend) is applied for them; otherwise anyone can type a code.
  const invite = await promotionFor(typeof ref === 'string' ? ref : undefined, user.id);
  const customer = await customerFor(user);
  const price = await monthlyPrice();
  const create = (withInvite: boolean) => stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    automatic_tax: { enabled: true },
    // An invite applies itself; without one, people with a code from us (e.g. a free first month)
    // can enter it on the payment page. Stripe allows one or the other.
    ...(withInvite && invite ? { discounts: [{ promotion_code: invite }] } : { allow_promotion_codes: true }),
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
  let session;
  try {
    session = await create(true);
  } catch (e) {
    // An invite only works for a first-time customer: without it, they can still pay.
    if (!invite) throw e;
    session = await create(false);
  }
  return json({ url: session.url });
});
