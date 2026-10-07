// Keeps accounts in step with Stripe: a new subscription creates an account, a cancelled or
// unpaid one loses access. Point a Stripe webhook at this function (see DEPLOY.md).
import { db, json, syncSubscription, timingSafeEqual } from '../_shared/yiga.ts'

const TOLERANCE_S = 300
const enc = new TextEncoder()

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]).filter((p) => p.length === 2))
  const t = Number(parts.t)
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`)))
  const hex = enc.encode([...mac].map((b) => b.toString(16).padStart(2, '0')).join(''))
  return sigs.some((s) => timingSafeEqual(enc.encode(s), hex))
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return json({ error: 'not_configured' }, 503)
  const payload = await req.text()
  if (!(await verifySignature(payload, req.headers.get('stripe-signature') ?? '', secret))) return json({ error: 'bad_signature' }, 400)

  const event = JSON.parse(payload)
  const { error: dup } = await db.from('yiga_webhook_events').insert({ id: event.id, type: event.type })
  if (dup?.code === '23505') return json({ received: true, duplicate: true })

  try {
    const o = event.data?.object ?? {}
    switch (event.type) {
      case 'checkout.session.completed':
        if (o.mode === 'subscription' && typeof o.subscription === 'string')
          await syncSubscription(o.subscription, { checkoutSessionId: o.id, email: o.customer_details?.email ?? null })
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(o.id)
        break
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const sub = o.subscription ?? o.parent?.subscription_details?.subscription
        if (typeof sub === 'string') await syncSubscription(sub)
        break
      }
    }
  } catch (e) {
    console.error(event.type, e)
    // Let Stripe retry later.
    await db.from('yiga_webhook_events').delete().eq('id', event.id)
    return json({ error: 'server_error' }, 500)
  }
  return json({ received: true })
})
