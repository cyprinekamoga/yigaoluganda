// Yiga Oluganda accounts: sign up, log in, pay (Stripe Checkout), sessions.
// Called by the website's /api/* proxy (netlify/edge-functions/api.ts), which keeps the session in an HttpOnly cookie.
import {
  ACTIVE_STATUSES,
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
const RESET_MINUTES = 60
const CHECKOUT_LOGIN_SECONDS = 3600
const RESET_COOLDOWN_MS = 2 * 60_000
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

const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Sends an email through Resend (https://resend.com). Returns false when email isn't set up. */
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'Yiga Oluganda <onboarding@resend.dev>', to: [to], subject, html, text }),
  })
  if (!res.ok) console.error('resend', res.status, await res.text())
  return res.ok
}

function resetEmail(link: string) {
  const subject = 'Nytt lösenord / New password – Yiga Oluganda'
  const text = `Hej!\n\nKlicka på länken för att välja ett nytt lösenord till Yiga Oluganda. Länken fungerar i ${RESET_MINUTES} minuter och kan bara användas en gång:\n${link}\n\nHar du inte bett om detta kan du strunta i mejlet.\n\n---\n\nHi!\n\nClick the link to choose a new password for Yiga Oluganda. It works for ${RESET_MINUTES} minutes and only once:\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n\nWebale nnyo – Ngaali`
  const a = `<a href="${escapeHtml(link)}" style="display:inline-block;background:#0e6f73;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">`
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#2b1d14;max-width:520px">
<p><strong>Hej!</strong> Klicka på knappen för att välja ett nytt lösenord till Yiga Oluganda. Länken fungerar i ${RESET_MINUTES} minuter och kan bara användas en gång.</p>
<p>${a}Välj nytt lösenord</a></p>
<p style="color:#6b5545">Har du inte bett om detta kan du strunta i mejlet.</p>
<hr style="border:0;border-top:1px solid #e5d7c3;margin:24px 0">
<p><strong>Hi!</strong> Click the button to choose a new password for Yiga Oluganda. The link works for ${RESET_MINUTES} minutes and only once.</p>
<p>${a}Choose a new password</a></p>
<p style="color:#6b5545">If you didn't ask for this, you can ignore this email.</p>
<p>Webale nnyo – Ngaali 🪶</p></div>`
  return { subject, html, text }
}

// ---------- fair (mässa) accounts, made by the seller ----------

const FAIR_MONTHS = 1
const PLACES = [
  'kampala', 'jinja', 'entebbe', 'masaka', 'mbarara', 'gulu', 'mbale', 'kabale', 'lira', 'soroti',
  'mukono', 'wakiso', 'hoima', 'kasese', 'arua', 'tororo', 'iganga', 'busia', 'masindi', 'kalangala',
]
// No 0/o, 1/l/i: easy to read out loud and type from an SMS.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PW_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

function randomInt(max: number): number {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x1_0000_0000 / max) * max
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % max
}
const fairUsername = () => `${PLACES[randomInt(PLACES.length)]}-${String(100 + randomInt(900))}`
const fairPassword = () => {
  const pick = () => Array.from({ length: 4 }, () => PW_CHARS[randomInt(PW_CHARS.length)]).join('')
  return `${pick()}-${pick()}`
}
const addMonths = (from: Date, months: number) => {
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return d
}

async function sellerSession(body: Record<string, unknown>) {
  const s = await sessionAccount(str(body.token))
  if (!s) return { error: json({ error: 'no_session' }, 401) }
  if (!s.account.is_seller) return { error: json({ error: 'not_seller' }, 403) }
  return { s }
}

// deno-lint-ignore no-explicit-any
const fairRow = (a: any) => ({
  id: a.id,
  username: a.username,
  name: a.customer_name ?? '',
  phone: a.customer_phone ?? '',
  createdAt: a.created_at,
  paidUntil: a.manual_access_until,
  subscribed: ACTIVE_STATUSES.includes(a.subscription_status),
  active: hasAccess(a),
})

const actions: Record<string, (body: Record<string, unknown>) => Promise<Response>> = {
  /** Seller: makes a username and password for a customer at the fair. The password is shown once. */
  async 'seller-create'(body) {
    const { s, error } = await sellerSession(body)
    if (error) return error
    const paidAtFair = body.paid === true
    const name = str(body.name, 80).trim() || null
    const phone = str(body.phone, 30).replace(/[^\d+ -]/g, '').trim() || null
    const password = fairPassword()
    const passwordHash = await hashPassword(password)
    for (let attempt = 0; attempt < 8; attempt++) {
      const username = fairUsername()
      const { data, error: insertError } = await db
        .from('yiga_accounts')
        .insert({
          username,
          password_hash: passwordHash,
          must_change_password: false,
          created_by_seller: true,
          customer_name: name,
          customer_phone: phone,
          manual_access_until: paidAtFair ? addMonths(new Date(), FAIR_MONTHS).toISOString() : null,
        })
        .select('*')
        .single()
      if (insertError?.code === '23505') continue // that username is taken: try another
      if (insertError) throw insertError
      console.log('seller-create', s!.account.username, data.username)
      return json({ ...fairRow(data), password, siteUrl: siteUrl() })
    }
    return json({ error: 'try_again' }, 503)
  },

  /** Seller: the latest fair accounts. */
  async 'seller-list'(body) {
    const { error } = await sellerSession(body)
    if (error) return error
    const { data, error: listError } = await db
      .from('yiga_accounts')
      .select('*')
      .eq('created_by_seller', true)
      .order('created_at', { ascending: false })
      .limit(100)
    if (listError) throw listError
    return json({ accounts: (data ?? []).map(fairRow), siteUrl: siteUrl() })
  },

  /** Seller: the customer paid another month (Swish/cash). */
  async 'seller-extend'(body) {
    const { error } = await sellerSession(body)
    if (error) return error
    const id = str(body.id, 40)
    if (!UUID.test(id)) return json({ error: 'not_found' }, 404)
    const { data: a } = await db.from('yiga_accounts').select('*').eq('id', id).eq('created_by_seller', true).maybeSingle()
    if (!a) return json({ error: 'not_found' }, 404)
    const base = a.manual_access_until && new Date(a.manual_access_until) > new Date() ? new Date(a.manual_access_until) : new Date()
    const { data, error: updateError } = await db
      .from('yiga_accounts')
      .update({ manual_access_until: addMonths(base, FAIR_MONTHS).toISOString() })
      .eq('id', a.id)
      .select('*')
      .single()
    if (updateError) throw updateError
    return json(fairRow(data))
  },

  /** Seller: a new password for a fair account (they have no email for "forgot password"). Logs out its devices. */
  async 'seller-password'(body) {
    const { error } = await sellerSession(body)
    if (error) return error
    const id = str(body.id, 40)
    if (!UUID.test(id)) return json({ error: 'not_found' }, 404)
    const { data: a } = await db.from('yiga_accounts').select('*').eq('id', id).eq('created_by_seller', true).maybeSingle()
    if (!a) return json({ error: 'not_found' }, 404)
    const password = fairPassword()
    const { data, error: updateError } = await db
      .from('yiga_accounts')
      .update({ password_hash: await hashPassword(password), failed_logins: 0, locked_until: null })
      .eq('id', a.id)
      .select('*')
      .single()
    if (updateError) throw updateError
    await db.from('yiga_sessions').delete().eq('account_id', a.id)
    return json({ ...fairRow(data), password, siteUrl: siteUrl() })
  },

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
    else {
      // Fair accounts have a username, not an email: then Stripe asks for the email itself.
      const email = s.account.email ?? s.account.username
      if (EMAIL.test(email)) params.customer_email = email
    }
    const session = await stripe('POST', 'checkout/sessions', params)
    return json({ url: session.url })
  },

  /**
   * Back from Stripe: unlock the app straight away (the webhook does it too, a moment later).
   * If this browser isn't logged in as the payer (another address, another browser, an older login),
   * the paid checkout logs the payer in, once, within an hour of paying.
   */
  async confirm(body) {
    const sessionId = str(body.sessionId)
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sessionId)) return json({ error: 'bad_request' }, 400)
    if (!stripeConfigured()) return json({ error: 'not_configured' }, 503)
    const cs = await stripe('GET', `checkout/sessions/${sessionId}`)
    const accountId = typeof cs.client_reference_id === 'string' ? cs.client_reference_id : null
    if (!accountId) return json({ error: 'bad_request' }, 400)
    const paid = cs.status === 'complete' && ['paid', 'no_payment_required'].includes(cs.payment_status)
    if (!paid || typeof cs.subscription !== 'string') return json({ error: 'not_paid', active: false }, 402)
    const account = await syncSubscription(cs.subscription, { accountId, checkoutSessionId: sessionId })
    if (!account) return json({ error: 'not_found' }, 404)

    // The first return from this checkout is recorded, so the link can't log anyone in a second time.
    const { error: used } = await db.from('yiga_checkout_logins').insert({ checkout_session_id: sessionId, account_id: account.id })
    const firstUse = !used

    const s = await sessionAccount(str(body.token))
    if (s && s.account.id === account.id) return json({ active: hasAccess(account) })
    if (!firstUse || Date.now() / 1000 - cs.created > CHECKOUT_LOGIN_SECONDS) return json({ error: 'login_needed' }, 401)
    if (s) await db.from('yiga_sessions').delete().eq('token_hash', s.tokenHash)
    return json({ ...(await newSession(account.id)), username: account.username, active: hasAccess(account) })
  },

  /** "Forgot password": emails a one-time link. Always answers the same, so it never reveals who has an account. */
  async forgot(body) {
    if (!Deno.env.get('RESEND_API_KEY') || !siteUrl()) return json({ error: 'not_configured' }, 503)
    const email = str(body.email, 254).trim().toLowerCase()
    if (!EMAIL.test(email)) return json({ error: 'bad_email' }, 400)
    const { data: account } = await db.from('yiga_accounts').select('id, email, username').eq('username', email).maybeSingle()
    if (account) {
      const { data: recent } = await db
        .from('yiga_password_resets')
        .select('created_at')
        .eq('account_id', account.id)
        .gt('created_at', new Date(Date.now() - RESET_COOLDOWN_MS).toISOString())
        .limit(1)
      if (!recent?.length) {
        const token = newSessionToken()
        await db.from('yiga_password_resets').insert({
          token_hash: await sha256(token),
          account_id: account.id,
          expires_at: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(),
        })
        // The token travels after "#", so it never reaches server logs.
        const mail = resetEmail(`${siteUrl()}/reset.html#token=${token}`)
        await sendEmail(account.email ?? account.username, mail.subject, mail.html, mail.text)
      }
    }
    return json({ ok: true })
  },

  /** Sets a new password from the emailed link, logs out every device and logs in this one. */
  async reset(body) {
    const resetToken = str(body.resetToken, 100)
    const password = str(body.newPassword, 200)
    if (password.length < 8) return json({ error: 'too_short' }, 400)
    if (!resetToken) return json({ error: 'bad_link' }, 400)
    const { data: row } = await db
      .from('yiga_password_resets')
      .select('token_hash, account_id, expires_at, used_at')
      .eq('token_hash', await sha256(resetToken))
      .maybeSingle()
    if (!row || row.used_at || new Date(row.expires_at) < new Date()) return json({ error: 'bad_link' }, 400)
    // Use the link up first, so it can't be used twice at the same moment.
    const { data: used } = await db
      .from('yiga_password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', row.token_hash)
      .is('used_at', null)
      .select('token_hash')
    if (!used?.length) return json({ error: 'bad_link' }, 400)
    const { data: account, error } = await db
      .from('yiga_accounts')
      .update({ password_hash: await hashPassword(password), must_change_password: false, failed_logins: 0, locked_until: null })
      .eq('id', row.account_id)
      .select('*')
      .single()
    if (error) throw error
    await db.from('yiga_sessions').delete().eq('account_id', account.id)
    return json({ ...(await newSession(account.id)), username: account.username, active: hasAccess(account) })
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
    return json({
      ...(await newSession(account.id)),
      username: account.username,
      mustChange: account.must_change_password,
      active: hasAccess(account),
      seller: Boolean(account.is_seller),
    })
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
