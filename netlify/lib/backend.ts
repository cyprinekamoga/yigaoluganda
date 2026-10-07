// Talks to the account functions on Supabase (supabase/functions/yiga-api).
declare const Netlify: { env: { get(name: string): string | undefined } }

const DEFAULT_URL = 'https://ilcwxstkuuyydnskobll.supabase.co/functions/v1/yiga-api'
export const COOKIE = 'yiga_session'

export function backendUrl(): string {
  return Netlify.env.get('YIGA_API_URL') || DEFAULT_URL
}

export async function backend(action: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(backendUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, action }),
  })
}

export function readCookie(req: Request, name = COOKIE): string {
  const header = req.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return ''
}

export function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}
export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
