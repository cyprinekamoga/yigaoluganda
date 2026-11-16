import { createClient, type User } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@23.1.0';
import { env } from './http.ts';

export const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });

/** Service-role client: bypasses row level security, so only ever used on the server. */
export const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Set up by scripts/stripe-setup.ts. Found by name, so no ids need copying into secrets. */
export const PRICE_LOOKUP_KEY = 'yiga-oluganda-monthly';
export const PORTAL_TAG = 'yiga-oluganda';

/** The monthly price (all currencies), by its lookup key. */
export async function monthlyPrice(): Promise<string> {
  const fromEnv = Deno.env.get('STRIPE_PRICE_ID');
  if (fromEnv) return fromEnv;
  const { data } = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
  if (!data[0]) throw new Error('No active Stripe price with lookup key ' + PRICE_LOOKUP_KEY);
  return data[0].id;
}

/** Our customer-portal configuration (tagged in its metadata), or Stripe's default. */
export async function portalConfiguration(): Promise<string | undefined> {
  const fromEnv = Deno.env.get('STRIPE_PORTAL_CONFIGURATION');
  if (fromEnv) return fromEnv;
  const { data } = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  return data.find((c) => c.metadata?.app === PORTAL_TAG)?.id;
}

/**
 * When the caller last really logged in (password, Google, an e-mail link), in ms. The token's
 * "amr" claim keeps that time when the session is only refreshed, so a stolen or long-open session
 * can't pass for a fresh login.
 */
export function lastLoginAt(req: Request): number {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { amr?: { timestamp?: number }[] };
    return Math.max(0, ...(payload.amr ?? []).map((a) => (a.timestamp ?? 0) * 1000));
  } catch {
    return 0;
  }
}

/** The signed-in user who called the function, or null. */
export async function callingUser(req: Request): Promise<User | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

/**
 * The user's Stripe customer id, creating the customer the first time. A stored id that Stripe
 * doesn't know (e.g. a test-mode customer after switching to live keys) is replaced.
 */
export async function customerFor(user: User): Promise<string> {
  const { data } = await admin.from('customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (data?.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(data.stripe_customer_id);
      if (!('deleted' in existing && existing.deleted)) return existing.id;
    } catch (e) {
      if ((e as { code?: string }).code !== 'resource_missing') throw e;
    }
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: (user.user_metadata?.name as string | undefined) || undefined,
    metadata: { user_id: user.id },
  });
  await admin.from('customers').upsert({ user_id: user.id, stripe_customer_id: customer.id });
  return customer.id;
}

const iso = (seconds?: number | null) => (seconds ? new Date(seconds * 1000).toISOString() : null);

/** Copies a Stripe subscription into our subscriptions table. */
export async function saveSubscription(sub: Stripe.Subscription, userId?: string) {
  let uid = userId ?? (sub.metadata?.user_id as string | undefined);
  if (!uid) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const { data } = await admin.from('customers').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    uid = data?.user_id;
  }
  if (!uid) throw new Error(`No user for subscription ${sub.id}`);
  const item = sub.items.data[0];
  // Newer Stripe API versions keep the billing period on the subscription item.
  const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  const { error } = await admin.from('subscriptions').upsert({
    id: sub.id,
    user_id: uid,
    status: sub.status,
    price_id: item?.price.id ?? null,
    currency: sub.currency,
    current_period_end: iso(periodEnd),
    cancel_at_period_end: sub.cancel_at_period_end,
    created_at: iso(sub.created),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
