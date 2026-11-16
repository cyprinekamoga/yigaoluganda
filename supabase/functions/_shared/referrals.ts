// Refer a friend. A learner's code is a Stripe promotion code for FRIEND_COUPON (first month free,
// first-time customers only). The friend's sign-up is recorded at checkout; once the friend pays for
// a month after the free one, the learner earns REWARD_COUPON (one free month), applied to their
// subscription one at a time. Coupons are created by scripts/stripe-setup.ts.
import type Stripe from 'npm:stripe@23.1.0';
import { admin, stripe } from './clients.ts';

export const FRIEND_COUPON = 'yiga-referral-friend';
export const REWARD_COUPON = 'yiga-referral-reward';
const ACTIVE = ['active', 'trialing', 'past_due'];
/** No look-alikes (0/O, 1/I). */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** "SARA-7K3D": the first letters of the name (A–Z only) and four random characters. */
export function makeCode(name: string): string {
  const base = (name.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'YIGA').padEnd(4, 'X');
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `${base}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

/** The learner's code, creating it (and its Stripe promotion code) the first time. */
export async function codeFor(userId: string, name: string): Promise<string> {
  const { data } = await admin.from('referral_codes').select('code').eq('user_id', userId).maybeSingle();
  if (data?.code) return data.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode(name);
    try {
      const promo = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: FRIEND_COUPON },
        code,
        restrictions: { first_time_transaction: true },
        metadata: { referrer: userId },
      });
      const { error } = await admin.from('referral_codes').insert({ user_id: userId, code, promotion_code_id: promo.id });
      if (error) {
        await stripe.promotionCodes.update(promo.id, { active: false });
        // Another request made one at the same time: use that.
        const { data: again } = await admin.from('referral_codes').select('code').eq('user_id', userId).maybeSingle();
        if (again?.code) return again.code;
        continue;
      }
      return code;
    } catch (e) {
      // The code is taken in Stripe: try another.
      if ((e as { code?: string }).code === 'resource_already_exists') continue;
      throw e;
    }
  }
  throw new Error('Could not create a referral code');
}

/** The Stripe promotion code id for a code someone typed or followed, unless it is their own. */
export async function promotionFor(code: string | undefined, userId: string): Promise<string | null> {
  const clean = (code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,24}$/.test(clean)) return null;
  const { data } = await admin.from('referral_codes').select('user_id, promotion_code_id').eq('code', clean).maybeSingle();
  if (!data || data.user_id === userId) return null;
  return data.promotion_code_id;
}

/** After checkout: if the friend used someone's code, remember who invited them. */
export async function recordReferral(session: Stripe.Checkout.Session) {
  const friend = session.client_reference_id;
  if (!friend) return;
  let promoId: string | undefined;
  for (const d of session.discounts ?? []) {
    const p = d.promotion_code;
    promoId ??= typeof p === 'string' ? p : p?.id;
  }
  if (!promoId) {
    // A code typed on Stripe's page: read it from the session's discount breakdown.
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['total_details.breakdown'] });
    for (const d of full.total_details?.breakdown?.discounts ?? []) {
      const p = d.discount.promotion_code;
      promoId ??= typeof p === 'string' ? p : p?.id;
    }
  }
  if (!promoId) return;
  const { data: owner } = await admin.from('referral_codes').select('user_id, code').eq('promotion_code_id', promoId).maybeSingle();
  if (!owner || owner.user_id === friend) return;
  await admin.from('referrals').upsert({ referrer_id: owner.user_id, friend_id: friend, code: owner.code }, { onConflict: 'friend_id', ignoreDuplicates: true });
}

/** A paid invoice: the friend's first real payment earns the referrer a month; and the payer's own
 *  earned months are applied, one at a time. */
export async function onInvoicePaid(invoice: Stripe.Invoice) {
  const customer = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customer) return;
  const { data: c } = await admin.from('customers').select('user_id').eq('stripe_customer_id', customer).maybeSingle();
  const uid = c?.user_id as string | undefined;
  if (!uid) return;
  if ((invoice.amount_paid ?? 0) > 0) {
    const { data: ref } = await admin.from('referrals').select('id, referrer_id').eq('friend_id', uid).eq('status', 'joined').maybeSingle();
    if (ref) {
      await admin.from('referrals').update({ status: 'earned', earned_at: new Date().toISOString() }).eq('id', ref.id);
      await applyReward(ref.referrer_id);
    }
  }
  await applyReward(uid);
}

/** Puts one earned free month on the learner's subscription, if one is waiting and none is pending. */
export async function applyReward(userId: string) {
  const { data: waiting } = await admin.from('referrals').select('id').eq('referrer_id', userId).eq('status', 'earned').order('earned_at').limit(1);
  if (!waiting?.length) return;
  const { data: subs } = await admin.from('subscriptions').select('id, status').eq('user_id', userId);
  const sub = subs?.find((s) => ACTIVE.includes(s.status));
  if (!sub) return; // kept until they subscribe again
  const live = await stripe.subscriptions.retrieve(sub.id);
  if ((live.discounts ?? []).length > 0) return; // a discount is still to be used: one at a time
  await stripe.subscriptions.update(sub.id, { discounts: [{ coupon: REWARD_COUPON }] });
  await admin.from('referrals').update({ status: 'rewarded', rewarded_at: new Date().toISOString() }).eq('id', waiting[0].id);
}
