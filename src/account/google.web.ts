/**
 * "Continue with Google" on the web, with Google's own button (Google Identity Services).
 * Google hands the page a signed ID token; Supabase checks it and logs the person in
 * (signInWithIdToken). Unlike the redirect flow, Google's window shows app.yigaoluganda.com,
 * not the Supabase project's address.
 *
 * Needs the public EXPO_PUBLIC_GOOGLE_CLIENT_ID (the Google Cloud "Web application" client) and
 * Google switched on in Supabase with that client id. Without it the button is not shown.
 */
import { useApp } from '../state/store';
import { ACCOUNTS, GOOGLE_CLIENT_ID } from './config';
import type { GoogleButtonOptions, GoogleResult } from './google';
import { useAccount } from './store';
import { supabase } from './supabase';

export type { GoogleButtonOptions, GoogleResult } from './google';

interface GoogleId {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    nonce: string;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(el: HTMLElement, options: Record<string, string | number>): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

export const googleAvailable = ACCOUNTS && Boolean(GOOGLE_CLIENT_ID);

const SCRIPT = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleId> | null = null;

function loadGoogle(): Promise<GoogleId> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in did not load')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Google sign-in did not load'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** A random one-time value; Google gets its SHA-256, Supabase the value itself, and they must match. */
function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The first name in Google's ID token, for the greeting ("Gyebale ko, Ada!"). */
export function firstNameFromToken(token: string): string {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(decodeURIComponent(escape(atob(part)))) as { given_name?: string; name?: string };
    return (payload.given_name || (payload.name ?? '').split(' ')[0] || '').trim().slice(0, 24);
  } catch {
    return '';
  }
}

/** Puts Google's button in `el`. `done` hears how the sign-in went (only failures need showing). */
export async function mountGoogleButton(el: HTMLElement, options: GoogleButtonOptions, done: (r: GoogleResult) => void): Promise<void> {
  if (!googleAvailable || !supabase) return;
  let google: GoogleId;
  try {
    google = await loadGoogle();
  } catch {
    // Blocked (privacy add-ons) or offline: leave the e-mail form on its own.
    return done({ ok: false, unavailable: true });
  }
  const nonce = randomNonce();
  google.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: await sha256Hex(nonce),
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
    callback: async ({ credential }) => {
      if (!supabase) return;
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
      if (error || !data.user) return done({ ok: false, error: 'auth.errGoogle' });
      // A brand-new account: keep the language chosen here, and go straight on to the payment page.
      const created = Date.parse(data.user.created_at ?? '');
      if (Number.isFinite(created) && Date.now() - created < 5 * 60_000) {
        useApp.getState().start(firstNameFromToken(credential), options.lang);
        useAccount.setState({ payNext: true });
      }
      done({ ok: true });
    },
  });
  el.replaceChildren();
  // Google's button lives in an iframe with a light colour scheme. On our dark page the browser
  // would paint that iframe white; matching the scheme keeps its background transparent.
  el.style.colorScheme = 'light';
  google.renderButton(el, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: options.text,
    logo_alignment: 'center',
    width: Math.round(Math.max(220, Math.min(400, el.clientWidth || 320))),
    locale: options.lang,
  });
}
