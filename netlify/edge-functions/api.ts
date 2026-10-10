// /api/* on the website. Passes requests to the account backend and keeps the login
// in an HttpOnly cookie, so page scripts never see the session token.
import { backend, clearCookie, readCookie, sessionCookie } from '../lib/backend.ts'

const PUBLIC = new Set(['signup', 'login'])
const WITH_SESSION = new Set(['me', 'checkout', 'confirm', 'session', 'change-password', 'logout', 'portal'])

function reply(body: unknown, status: number, cookie?: string): Response {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' })
  if (cookie) headers.append('set-cookie', cookie)
  return new Response(JSON.stringify(body), { status, headers })
}

export default async (req: Request): Promise<Response> => {
  const action = new URL(req.url).pathname.replace(/^\/api\//, '').replace(/\/$/, '')
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405)
  if (!PUBLIC.has(action) && !WITH_SESSION.has(action)) return reply({ error: 'not_found' }, 404)
  // Only accept calls from our own pages.
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) return reply({ error: 'forbidden' }, 403)

  let body: Record<string, unknown> = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch {
    return reply({ error: 'bad_request' }, 400)
  }
  delete body.action
  delete body.token
  if (WITH_SESSION.has(action)) body.token = readCookie(req)

  let res: Response
  try {
    res = await backend(action, body)
  } catch {
    return reply({ error: 'backend_unreachable' }, 502)
  }
  const data = await res.json().catch(() => ({ error: 'server_error' }))

  if ((action === 'login' || action === 'signup') && res.ok && typeof data.token === 'string') {
    const { token, maxAge, ...rest } = data
    return reply(rest, 200, sessionCookie(token, Number(maxAge) || 2_592_000))
  }
  if (action === 'logout') return reply({ ok: true }, 200, clearCookie)
  if ((action === 'session' || action === 'me') && res.status === 401) return reply(data, 401, clearCookie)
  return reply(data, res.status)
}

export const config = { path: '/api/*' }
