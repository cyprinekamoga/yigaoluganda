/**
 * Paid web version: the website only serves /app/ to people with a valid login
 * (netlify/edge-functions/gate.ts). This module lets the app re-check when it starts
 * (it may be running from the offline cache after a subscription ended) and offers log out
 * and the subscription page. In every other build LOGIN_REQUIRED is false and nothing here runs.
 */
export const LOGIN_REQUIRED = import.meta.env.VITE_REQUIRE_LOGIN === 'true'

export interface SessionInfo {
  username: string
}

async function api(action: string, body: Record<string, unknown> = {}): Promise<Response> {
  return fetch(`/api/${action}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** 'ok' with the username, 'login' when access is gone, 'offline' when we can't tell (keep going). */
export async function checkSession(): Promise<{ status: 'ok'; info: SessionInfo } | { status: 'login' | 'offline' }> {
  try {
    const res = await api('session')
    if (res.ok) {
      const data = await res.json()
      if (data.mustChange) return { status: 'login' }
      return { status: 'ok', info: { username: String(data.username ?? '') } }
    }
    return res.status === 401 || res.status === 402 ? { status: 'login' } : { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}

export function goToLogin(): void {
  window.location.assign('/login.html?next=/app/')
}

export async function logout(): Promise<void> {
  try {
    await api('logout')
  } finally {
    window.location.assign('/login.html?bye=1')
  }
}

/** Stripe's page for changing card, receipts and cancelling. */
export async function openSubscriptionPage(): Promise<boolean> {
  try {
    const res = await api('portal')
    const data = await res.json()
    if (res.ok && typeof data.url === 'string' && data.url.startsWith('https://')) {
      window.location.assign(data.url)
      return true
    }
  } catch {
    /* fall through */
  }
  return false
}
