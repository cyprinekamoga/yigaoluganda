// Stripe → our database. Keeps public.subscriptions in step with Stripe, which is what unlocks
// the app. Deployed without Supabase login (see config.toml): Stripe's signature is checked instead.
import Stripe from 'npm:stripe@23.1.0';
import { admin, saveSubscription, stripe } from '../_shared/clients.ts';
import { env } from '../_shared/http.ts';
import { checkCard, onInvoicePaid, recordReferral } from '../_shared/referrals.ts';

const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, env('STRIPE_WEBHOOK_SECRET'), undefined, crypto);
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  // Stripe can deliver the same event more than once; handle each only once.
  const { error: dup } = await admin.from('stripe_events').insert({ id: event.id });
  if (dup) return new Response('already handled', { status: 200 });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await saveSubscription(await stripe.subscriptions.retrieve(id), session.client_reference_id ?? undefined);
          // A friend who came with someone's invite code.
          await recordReferral(session);
          // One free month per card.
          await checkCard(session, id);
        }
        break;
      }
      case 'invoice.paid':
        // Refer a friend: a friend's first real payment earns the inviter a free month.
        await onInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await saveSubscription(event.data.object);
        break;
    }
  } catch (e) {
    // Let Stripe retry later.
    await admin.from('stripe_events').delete().eq('id', event.id);
    console.error(e);
    return new Response('error', { status: 500 });
  }
  return new Response('ok', { status: 200 });
});
