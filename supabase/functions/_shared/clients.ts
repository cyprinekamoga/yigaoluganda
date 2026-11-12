import { createClient, type User } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@23.1.0';
import { env } from './http.ts';

export const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });

/** Service-role client: bypasses row level security, so only ever used on the server. */
export const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** The signed-in user who called the function, or null. */
export async function callingUser(req: Request): Promise<User | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

/** The user's Stripe customer id, creating the customer the first time. */
export async function customerFor(user: User): Promise<string> {
  const { data } = await admin.from('customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: user.email,
    name: (user.user_metadata?.name as string | undefined) || undefined,
    metadata: { user_id: user.id },
  });
  await admin.from('customers').insert({ user_id: user.id, stripe_customer_id: customer.id });
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
