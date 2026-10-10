// Yiga Oluganda accounts: sign up, log in, pay (Stripe Checkout), sessions.
// Called by the website's /api/* proxy (netlify/edge-functions/api.ts), which keeps the session in an HttpOnly cookie.
import {
  db,
  hashPassword,
  hasAccess,
  json,
  newSessionToken,
  SESSION_DAYS,
  sha256,
  stripe,
  stripeConfigured,
  syncSubscription,
  verifyPassword,
} from '../_shared/yiga.ts'

const MAX_FAILED = 5
const LOCK_MINUTES = 15
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

const siteUrl = () => (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '')

async function sessionAccount(token: string) {
  if (!token) return null
  const { data } = await db
    .from('yiga_sessions')
    .select('token_hash, expires_at, account:yiga_accounts(*)')
    .eq('token_hash', await sha256(token))
    .maybeSingle()
  if (!data || new Date(data.expires_at) < new Date()) return null
  // deno-lint-ignore no-explicit-any
  return { tokenHash: data.token_hash as string, account: data.account as any }
}

async function newSession(accountId: string) {
  const token = newSessionToken()
  await db.from('yiga_sessions').insert({
    token_hash: await sha256(token),
    account_id: accountId,
    expires_at: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
  })
  return { token, maxAge: SESSION_DAYS * 86_400 }
}

const actions: Record<string, (body: Record<string, unknown>) => Promise<Response>> = {
  /** Creates an account (email + password) and logs it in. Payment comes next. */
  async signup(body) {
    const email = str(body.email, 254).trim().toLowerCase()
    const password = str(body.password, 200)
    if (!EMAIL.test(email)) return json({ error: 'bad_email' }, 400)
    if (password.length < 8) return json({ error: 'too_short' }, 400)
    const { data: account, error } = await db
      .from('yiga_accounts')
      .insert({ username: email, email, password_hash: await hashPassword(password), must_change_password: false })
      .select('*')
      .single()
    if (error?.code === '23505') return json({ error: 'exists' }, 409)
    if (error) throw error
    return json({ ...(await newSession(account.id)), username: email, active: false })
  },

  /** Who is logged in, and have they paid? */
  async me(body) {
    const s = await sessionAccount(str(body.token))
    if (!s) return json({ error: 'no_session' }, 401)
    return json({ username: s.account.username, active: hasAccess(s.account) })
  },

  /** Starts Stripe Checkout for the logged-in account's monthly subscription. */
  async checkout(body) {
    const s = await sessionAccount(str(body.token))
    if (!s) return json({ error: 'no_session' }, 401)
    if (hasAccess(s.account)) return json({ error: 'already_active' }, 409)
    if (!stripeConfigured() || !Deno.env.get('STRIPE_PRICE_ID') || !siteUrl()) return json({ error: 'not_configured' }, 503)
    const params: Record<string, string> = {
      mode: 'subscription',
      'line_items[0][price]': Deno.env.get('STRIPE_PRICE_ID')!,
      'line_items[0][quantity]': '1',
      client_reference_id: s.account.id,
      'subscription_data[metadata][account_id]': s.account.id,
      success_url: `${siteUrl()}/welcome.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/pay.html`,
      allow_promotion_codes: 'true',
      locale: 'auto',
    }
    if (s.account.stripe_customer_id) params.customer = s.account.stripe_customer_id
    else params.customer_email = s.account.email ?? s.account.username
    const session = await stripe('POST', 'checkout/sessions', params)
    return json({ url: session.url })
  },

  /** Back from Stripe: unlock the app straight away (the webhook would do it too, a moment later). */
  async confirm(body) {
    const s = await sessionAccount(str(body.token))
    if (!s) return json({ error: 'no_session' }, 401)
    const sessionId = str(body.sessionId)
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sessionId)) return json({ error: 'bad_request' }, 400)
    if (!stripeConfigured()) return json({ error: 'not_configured' }, 503)
    const cs = await stripe('GET', `checkout/sessions/${sessionId}`)
    if (cs.client_reference_id !== s.account.id) return json({ error: 'not_yours' }, 403)
    const paid = cs.status === 'complete' && ['paid', 'no_payment_required'].includes(cs.payment_status)
    if (!paid || typeof cs.subscription !== 'string') return json({ error: 'not_paid', active: false }, 402)
    const account = await syncSubscription(cs.subscription, { accountId: s.account.id, checkoutSessionId: sessionId })
    return json({ active: hasAccess(account) })
  },

  async login(body) {
    const username = str(body.username ?? body.email, 254).trim().toLowerCase()
    const password = str(body.password, 200)
    const { data: account } = await db.from('yiga_accounts').select('*').eq('username', username).maybeSingle()
    if (account?.locked_until && new Date(account.locked_until) > new Date()) return json({ error: 'locked' }, 429)

    const ok = await verifyPassword(password, account?.password_hash ?? null)
    if (!account || !ok) {
      if (account) await db.rpc('yiga_register_failed_login', { p_account: account.id, p_max: MAX_FAILED, p_lock_minutes: LOCK_MINUTES })
      return json({ error: 'wrong_login' }, 401)
    }
    await db.from('yiga_accounts').update({ failed_logins: 0, locked_until: null }).eq('id', account.id)
    return json({ ...(await newSession(account.id)), username: account.username, mustChange: account.must_change_password, active: hasAccess(account) })
  },

  /** Is this session allowed into the app right now? */
  async session(body) {
    const s = await sessionAccount(str(body.token))
    if (!s) return json({ error: 'no_session' }, 401)
    if (!hasAccess(s.account)) return json({ error: 'inactive' }, 402)
    return json({ ok: true, username: s.account.username, mustChange: s.account.must_change_password })
  },

  async 'change-password'(body) {
    const token = str(body.token)
    const s = await sessionAccount(token)
    if (!s) return json({ error: 'no_session' }, 401)
    const next = str(body.newPassword, 200)
    if (next.length < 8) return json({ error: 'too_short' }, 400)
    if (s.account.must_change_password === false) {
      // A normal change needs the current password too.
      if (!(await verifyPassword(str(body.currentPassword, 200), s.account.password_hash))) return json({ error: 'wrong_login' }, 401)
    }
    await db
      .from('yiga_accounts')
      .update({ password_hash: await hashPassword(next), must_change_password: false })
      .eq('id', s.account.id)
    // Log out every other device.
    await db.from('yiga_sessions').delete().eq('account_id', s.account.id).neq('token_hash', s.tokenHash)
    return json({ ok: true })
  },

  async logout(body) {
    const token = str(body.token)
    if (token) await db.from('yiga_sessions').delete().eq('token_hash', await sha256(token))
    return json({ ok: true })
  },

  /** Stripe's customer portal: change card, see receipts, cancel. */
  async portal(body) {
    const s = await sessionAccount(str(body.token))
    if (!s) return json({ error: 'no_session' }, 401)
    if (!stripeConfigured() || !s.account.stripe_customer_id) return json({ error: 'not_configured' }, 503)
    const portal = await stripe('POST', 'billing_portal/sessions', {
      customer: s.account.stripe_customer_id,
      return_url: `${siteUrl()}/app/`,
    })
    return json({ url: portal.url })
  },
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const action = actions[str(body.action, 40)]
  if (!action) return json({ error: 'unknown_action' }, 400)
  try {
    return await action(body)
  } catch (e) {
    console.error(body.action, e)
    return json({ error: 'server_error' }, 500)
  }
})
