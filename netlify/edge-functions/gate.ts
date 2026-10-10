// Guards /app/*: the learning app is only served to logged-in subscribers.
// Everyone else is sent to the login page (or gets 401 for files).
import { backend, readCookie } from '../lib/backend.ts'

type Context = { next: () => Promise<Response> }

// A short memory of recent checks, so loading the app's files doesn't ask the backend every time.
const recent = new Map<string, { ok: boolean; mustChange: boolean; unpaid?: boolean; until: number }>()
const REMEMBER_MS = 60_000

async function check(token: string) {
  const hit = recent.get(token)
  if (hit && hit.until > Date.now()) return hit
  let result = { ok: false, mustChange: false, until: Date.now() + REMEMBER_MS }
  try {
    const res = await backend('session', { token })
    if (res.ok) {
      const data = await res.json()
      result = { ok: true, mustChange: Boolean(data.mustChange), until: Date.now() + REMEMBER_MS }
    } else if (res.status === 402) {
      return { ...result, unpaid: true, until: 0 } // logged in, not paid yet
    } else if (res.status >= 500) {
      return { ...result, until: 0 } // backend trouble: don't remember
    }
  } catch {
    return { ...result, until: 0 }
  }
  // Only remember full access: a login that just changed its password must be let in at once.
  if (result.ok && !result.mustChange) {
    if (recent.size > 5000) recent.clear()
    recent.set(token, result)
  }
  return result
}

export default async (req: Request, context: Context): Promise<Response> => {
  const token = readCookie(req)
  const status = token ? await check(token) : null
  if (status?.ok && !status.mustChange) {
    const res = await context.next()
    const out = new Response(res.body, res)
    out.headers.set('cache-control', 'private, no-cache')
    return out
  }
  const isPage = req.method === 'GET' && (req.headers.get('accept') ?? '').includes('text/html')
  if (!isPage) return new Response('Login required', { status: 401, headers: { 'cache-control': 'no-store' } })
  const target = status?.unpaid ? '/pay.html' : status?.mustChange ? '/login.html?change=1' : '/login.html?next=/app/'
  return new Response(null, { status: 302, headers: { location: target, 'cache-control': 'no-store' } })
}

export const config = { path: ['/app', '/app/*'] }
