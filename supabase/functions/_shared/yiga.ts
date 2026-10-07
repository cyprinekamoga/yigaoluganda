// Shared code for the Yiga Oluganda account functions (Supabase Edge Functions, Deno).
import { createClient } from 'npm:@supabase/supabase-js@2'

export const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const SESSION_DAYS = 30
export const ACTIVE_STATUSES = ['active', 'trialing']

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

// ---------- randomness and hashing ----------

const enc = new TextEncoder()

function randomInt(max: number): number {
  // Rejection sampling, so every value is equally likely.
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % max
}
const pick = <T>(list: readonly T[]) => list[randomInt(list.length)]
const digits = (n: number) => Array.from({ length: n }, () => randomInt(10)).join('')
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

const PLACES = ['kampala', 'entebbe', 'jinja', 'gulu', 'mbale', 'mbarara', 'masaka', 'kabale', 'arua', 'lira', 'soroti', 'tororo', 'hoima', 'kasese', 'moroto', 'bwindi', 'rwenzori', 'elgon', 'ssese', 'murchison', 'kidepo', 'nile', 'victoria', 'kyoga'] as const
const THINGS = ['crane', 'kob', 'gorilla', 'matooke', 'rolex', 'posho', 'gonja', 'nsenene', 'mango', 'drum', 'boda', 'kanzu', 'gomesi', 'coffee', 'cassava', 'jackfruit', 'sunbird', 'shoebill', 'leopard', 'lion', 'hippo', 'elephant', 'chimp', 'mugavu'] as const

/** e.g. crane-kampala-482 */
export const newUsername = () => `${pick(THINGS)}-${pick(PLACES)}-${digits(3)}`
/** e.g. Matooke-Nile-Kob-7319 */
export const newTempPassword = () => `${cap(pick(THINGS))}-${cap(pick(PLACES))}-${cap(pick(THINGS))}-${digits(4)}`

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const PBKDF2_ITERATIONS = 210_000

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

/** Stored as pbkdf2$<iterations>$<salt>$<hash>. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const DUMMY = 'pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

/** Checks a password. With no stored hash it still does the work, so timing doesn't reveal which usernames exist. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, iter, salt, hash] = (stored ?? DUMMY).split('$')
  if (scheme !== 'pbkdf2') return false
  const actual = await pbkdf2(password, unb64(salt), Number(iter))
  return stored !== null && timingSafeEqual(actual, unb64(hash))
}

export async function sha256(text: string): Promise<string> {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))))
}

export const newSessionToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)))

// ---------- Stripe ----------

export function stripeConfigured(): boolean {
  return Boolean(Deno.env.get('STRIPE_SECRET_KEY'))
}

function form(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

// deno-lint-ignore no-explicit-any
export async function stripe(method: 'GET' | 'POST', path: string, params: Record<string, string> = {}): Promise<any> {
  const query = method === 'GET' && Object.keys(params).length ? `?${form(params)}` : ''
  const res = await fetch(`https://api.stripe.com/v1/${path}${query}`, {
    method,
    headers: {
      authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: method === 'POST' ? form(params) : undefined,
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Stripe ${path}: ${body?.error?.message ?? res.status}`)
  return body
}

// deno-lint-ignore no-explicit-any
export function periodEnd(sub: any): string | null {
  const ts = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  return typeof ts === 'number' ? new Date(ts * 1000).toISOString() : null
}

export interface AccountSync {
  subscriptionId: string
  customerId?: string | null
  email?: string | null
  checkoutSessionId?: string | null
  status: string
  currentPeriodEnd: string | null
}

/** Creates the account for a subscription the first time it is seen, otherwise updates it. Returns the account row. */
export async function upsertAccount(s: AccountSync) {
  const or = [`stripe_subscription_id.eq.${s.subscriptionId}`]
  if (s.checkoutSessionId) or.push(`checkout_session_id.eq.${s.checkoutSessionId}`)
  const { data: existing, error } = await db.from('yiga_accounts').select('*').or(or.join(',')).limit(1).maybeSingle()
  if (error) throw error

  const fields: Record<string, unknown> = {
    stripe_subscription_id: s.subscriptionId,
    subscription_status: s.status,
    current_period_end: s.currentPeriodEnd,
  }
  if (s.customerId) fields.stripe_customer_id = s.customerId
  if (s.email) fields.email = s.email
  if (s.checkoutSessionId) fields.checkout_session_id = s.checkoutSessionId

  if (existing) {
    const { data, error: e } = await db.from('yiga_accounts').update(fields).eq('id', existing.id).select('*').single()
    if (e) throw e
    return data
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error: e } = await db.from('yiga_accounts').insert({ ...fields, username: newUsername() }).select('*').single()
    if (!e) return data
    if (e.code !== '23505') throw e
    // A unique clash: either the username was taken (try another) or a parallel request created the account.
    const { data: again } = await db.from('yiga_accounts').select('*').or(or.join(',')).limit(1).maybeSingle()
    if (again) return again
  }
  throw new Error('Could not create a unique username')
}

/** Brings an account up to date from Stripe's copy of the subscription. */
export async function syncSubscription(subscriptionId: string, extra: Partial<AccountSync> = {}) {
  const sub = await stripe('GET', `subscriptions/${subscriptionId}`)
  return upsertAccount({
    subscriptionId,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    status: sub.status,
    currentPeriodEnd: periodEnd(sub),
    ...extra,
  })
}

export function hasAccess(account: { subscription_status: string } | null): boolean {
  return Boolean(account && ACTIVE_STATUSES.includes(account.subscription_status))
}
