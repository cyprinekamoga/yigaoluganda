// Sets up Stripe for Yiga Oluganda from the price table in src/pricing/pricing.ts:
//   0. Stripe Tax (Swedish registration, small-seller scheme),
//   1. a price per plan (monthly, yearly, Family monthly and yearly; net, VAT added by Stripe Tax)
//      in every local currency,
//   2. a customer-portal configuration (cancel at period end, change card, receipts, switch plan),
//   2b. the refer-a-friend coupons,
//   3. the webhook that keeps the app's database in step (with --webhook <supabase url>).
// Safe to run again: it reuses what exists. Never prints secret keys.
//
// Usage:  STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup -- [--webhook https://<ref>.supabase.co] [--new-price]
// Run it with a test-mode key first, then again with the live key.
import { DEFAULT_CURRENCY, PLAN_LOOKUP_KEY, PLAN_NET, PLANS, isFamilyPlan, isYearlyPlan, type Plan } from '../src/pricing/pricing.ts';

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

// 0. VAT (Stripe Tax): head office in Stockholm and a Swedish registration under the EU
//    "small seller" scheme, so every EU customer pays Swedish VAT (see src/pricing/pricing.ts).
const taxSettings = await stripe('GET', 'tax/settings');
if (taxSettings.status !== 'active') {
  await stripe('POST', 'tax/settings', {
    'head_office[address][country]': 'SE',
    'head_office[address][city]': 'Stockholm',
    'defaults[tax_behavior]': 'exclusive',
    'defaults[tax_code]': 'txcd_10000000',
  });
}
const regs = (await stripe('GET', 'tax/registrations', { status: 'active', limit: 20 })).data as { country: string }[];
if (!regs.some((r) => r.country === 'SE')) {
  await stripe('POST', 'tax/registrations', {
    country: 'SE',
    'country_options[se][type]': 'standard',
    'country_options[se][standard][place_of_supply_scheme]': 'small_seller',
    active_from: 'now',
  });
}
console.log('✓ Stripe Tax: Swedish VAT for the EU (small seller)');

// 1. Prices: one per plan, every currency. Monthly and yearly belong to the product "Yiga Oluganda",
//    the two Family plans to "Yiga Oluganda Family" (the names on receipts and in the portal).
const NICKNAME: Record<Plan, string> = { monthly: 'Monthly', yearly: 'Yearly', family_monthly: 'Family, monthly', family_yearly: 'Family, yearly' };
const PRODUCT_NAME = { single: 'Yiga Oluganda', family: 'Yiga Oluganda Family' };
const products: Partial<Record<'single' | 'family', string>> = {};
const priceIds = {} as Record<Plan, string>;
type Price = { id: string; product: string | { id: string } };
const productOf = (p: Price) => (typeof p.product === 'string' ? p.product : p.product.id);
const existingPrices = {} as Record<Plan, Price | undefined>;
for (const plan of PLANS) {
  existingPrices[plan] = (await stripe('GET', 'prices', { 'lookup_keys[]': PLAN_LOOKUP_KEY[plan], active: true })).data[0];
  const kind = isFamilyPlan(plan) ? 'family' : 'single';
  if (existingPrices[plan]) products[kind] ??= productOf(existingPrices[plan]!);
}
for (const kind of ['single', 'family'] as const) {
  if (products[kind]) continue;
  // Electronically supplied services.
  const product = await stripe('POST', 'products', { name: PRODUCT_NAME[kind], tax_code: 'txcd_10000000' });
  products[kind] = product.id;
  console.log(`✓ product ${PRODUCT_NAME[kind]} created`);
}
for (const plan of PLANS) {
  const existing = existingPrices[plan];
  if (existing && !flag('--new-price')) {
    priceIds[plan] = existing.id;
    console.log(`✓ ${NICKNAME[plan]} price ${existing.id} already exists (use --new-price after changing the table)`);
    continue;
  }
  const net = PLAN_NET[plan];
  const params: Params = {
    currency: DEFAULT_CURRENCY.toLowerCase(),
    unit_amount: net[DEFAULT_CURRENCY],
    'recurring[interval]': isYearlyPlan(plan) ? 'year' : 'month',
    tax_behavior: 'exclusive',
    lookup_key: PLAN_LOOKUP_KEY[plan],
    transfer_lookup_key: true,
    nickname: NICKNAME[plan],
    product: products[isFamilyPlan(plan) ? 'family' : 'single'],
  };
  for (const [cur, amount] of Object.entries(net)) {
    if (cur === DEFAULT_CURRENCY) continue;
    params[`currency_options[${cur.toLowerCase()}][unit_amount]`] = amount;
    params[`currency_options[${cur.toLowerCase()}][tax_behavior]`] = 'exclusive';
  }
  const price = await stripe('POST', 'prices', params);
  priceIds[plan] = price.id;
  if (existing) await stripe('POST', `prices/${existing.id}`, { active: false });
  console.log(`✓ ${NICKNAME[plan]} price ${price.id} (${Object.keys(net).length} currencies)`);
}

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
  // Switching plan: upgrades now (the difference is charged at once), and anything cheaper or
  // shorter (Family to single, yearly to monthly) from the end of the period already paid for.
  'features[subscription_update][enabled]': true,
  'features[subscription_update][default_allowed_updates][0]': 'price',
  'features[subscription_update][proration_behavior]': 'always_invoice',
  'features[subscription_update][products][0][product]': products.single,
  'features[subscription_update][products][0][prices][0]': priceIds.monthly,
  'features[subscription_update][products][0][prices][1]': priceIds.yearly,
  'features[subscription_update][products][1][product]': products.family,
  'features[subscription_update][products][1][prices][0]': priceIds.family_monthly,
  'features[subscription_update][products][1][prices][1]': priceIds.family_yearly,
  'features[subscription_update][schedule_at_period_end][conditions][0][type]': 'decreasing_item_amount',
  'features[subscription_update][schedule_at_period_end][conditions][1][type]': 'shortening_interval',
});
console.log(`✓ customer portal ${portal.id}`);

// 2b. Refer a friend: the friend's first month free (100% off one invoice; with VAT, it is then 0).
//     The one who invited them gets a free month by moving their next payment (no coupon).
for (const [id, name] of [['yiga-referral-friend', 'First month free (invited by a friend)']]) {
  try {
    await stripe('GET', `coupons/${id}`);
    console.log(`✓ coupon ${id}`);
  } catch {
    await stripe('POST', 'coupons', { id, name, percent_off: 100, duration: 'once' });
    console.log(`✓ coupon ${id} created`);
  }
}

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
    // Refer a friend: a friend's first real payment earns the inviter a free month.
    'enabled_events[6]': 'invoice.paid',
  });
  console.log(`✓ webhook ${endpoint.id} → ${endpoint.url}`);
  console.log('  Its signing secret is shown in the Stripe dashboard (Developers → Webhooks). Save it as STRIPE_WEBHOOK_SECRET.');
}

console.log('\nThe Edge Functions find the price and the portal by name; they only need the secrets STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.');
