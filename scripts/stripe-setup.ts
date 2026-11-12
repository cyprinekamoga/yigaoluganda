// Sets up Stripe for Yiga Oluganda from the price table in src/pricing/pricing.ts:
//   1. the monthly price (net, VAT added by Stripe Tax) in every local currency,
//   2. a customer-portal configuration (cancel at period end, change card, receipts),
//   3. the webhook that keeps the app's database in step (with --webhook <supabase url>).
// Safe to run again: it reuses what exists. Never prints secret keys.
//
// Usage:  STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup -- [--webhook https://<ref>.supabase.co] [--new-price]
// Run it with a test-mode key first, then again with the live key.
import { DEFAULT_CURRENCY, MONTHLY_NET } from '../src/pricing/pricing.ts';

const LOOKUP_KEY = 'yiga-oluganda-monthly';
const SITE = 'https://yigaoluganda.com';
const APP = 'https://app.yigaoluganda.com';
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (test or live secret key).');
  process.exit(1);
}
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

type Params = Record<string, string | number | boolean | undefined>;
async function stripe(method: 'GET' | 'POST', path: string, params: Params = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && [...body].length ? `?${body}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? body : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${data.error?.message ?? res.status}`);
  return data;
}

// 1. Price
const existing = (await stripe('GET', 'prices', { 'lookup_keys[]': LOOKUP_KEY, active: true })).data[0];
let priceId: string = existing?.id;
if (!existing || flag('--new-price')) {
  const base = DEFAULT_CURRENCY.toLowerCase();
  const params: Params = {
    currency: base,
    unit_amount: MONTHLY_NET[DEFAULT_CURRENCY],
    'recurring[interval]': 'month',
    tax_behavior: 'exclusive',
    lookup_key: LOOKUP_KEY,
    transfer_lookup_key: true,
    nickname: 'Monthly',
  };
  if (existing) params.product = typeof existing.product === 'string' ? existing.product : existing.product.id;
  else {
    params['product_data[name]'] = 'Yiga Oluganda';
    // Electronically supplied services.
    params['product_data[tax_code]'] = 'txcd_10000000';
  }
  for (const [cur, amount] of Object.entries(MONTHLY_NET)) {
    if (cur === DEFAULT_CURRENCY) continue;
    params[`currency_options[${cur.toLowerCase()}][unit_amount]`] = amount;
    params[`currency_options[${cur.toLowerCase()}][tax_behavior]`] = 'exclusive';
  }
  const price = await stripe('POST', 'prices', params);
  priceId = price.id;
  if (existing) await stripe('POST', `prices/${existing.id}`, { active: false });
  console.log(`✓ price ${priceId} (${Object.keys(MONTHLY_NET).length} currencies)`);
} else console.log(`✓ price ${priceId} already exists (use --new-price after changing the table)`);

// 2. Customer portal (tagged so the billing-portal function can find it)
const portals = (await stripe('GET', 'billing_portal/configurations', { active: true, limit: 100 })).data as { id: string; metadata?: Record<string, string> }[];
const ours = portals.find((c) => c.metadata?.app === 'yiga-oluganda');
const portal = await stripe('POST', ours ? `billing_portal/configurations/${ours.id}` : 'billing_portal/configurations', {
  'metadata[app]': 'yiga-oluganda',
  'business_profile[headline]': 'Yiga Oluganda',
  'business_profile[privacy_policy_url]': `${SITE}/privacy/`,
  'business_profile[terms_of_service_url]': `${SITE}/terms/`,
  default_return_url: `${APP}/settings`,
  'features[customer_update][enabled]': true,
  'features[customer_update][allowed_updates][0]': 'email',
  'features[customer_update][allowed_updates][1]': 'address',
  'features[invoice_history][enabled]': true,
  'features[payment_method_update][enabled]': true,
  'features[subscription_cancel][enabled]': true,
  'features[subscription_cancel][mode]': 'at_period_end',
  'features[subscription_cancel][cancellation_reason][enabled]': true,
  'features[subscription_cancel][cancellation_reason][options][0]': 'too_expensive',
  'features[subscription_cancel][cancellation_reason][options][1]': 'unused',
  'features[subscription_cancel][cancellation_reason][options][2]': 'other',
});
console.log(`✓ customer portal ${portal.id}`);

// 3. Webhook
const supabaseUrl = value('--webhook');
if (supabaseUrl) {
  const hookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/stripe-webhook`;
  const hooks = (await stripe('GET', 'webhook_endpoints', { limit: 100 })).data as { id: string; url: string }[];
  const found = hooks.find((h) => h.url === hookUrl);
  const endpoint = await stripe('POST', found ? `webhook_endpoints/${found.id}` : 'webhook_endpoints', {
    ...(found ? {} : { url: hookUrl }),
    description: 'Yiga Oluganda: keep subscriptions in step',
    'enabled_events[0]': 'checkout.session.completed',
    'enabled_events[1]': 'customer.subscription.created',
    'enabled_events[2]': 'customer.subscription.updated',
    'enabled_events[3]': 'customer.subscription.deleted',
    'enabled_events[4]': 'customer.subscription.paused',
    'enabled_events[5]': 'customer.subscription.resumed',
  });
  console.log(`✓ webhook ${endpoint.id} → ${endpoint.url}`);
  console.log('  Its signing secret is shown in the Stripe dashboard (Developers → Webhooks). Save it as STRIPE_WEBHOOK_SECRET.');
}

console.log('\nThe Edge Functions find the price and the portal by name; they only need the secrets STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.');
