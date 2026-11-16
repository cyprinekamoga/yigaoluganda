import type { ReactNode } from 'react';

/**
 * A bot test (Cloudflare Turnstile) on sign-up, log-in, "forgot password" and the password check
 * before deleting an account, when the build has a site key (EXPO_PUBLIC_TURNSTILE_SITE_KEY) and
 * Supabase Auth has CAPTCHA turned on with the secret. Only the web version has it
 * (captcha.web.tsx): Supabase's CAPTCHA setting applies to every app, so the phone apps need a
 * Turnstile widget of their own before it is turned on. Google sign-in needs no token.
 */
export interface Captcha {
  /** The widget to place above the button, or null when there is no bot test. */
  element: ReactNode;
  /** The token for the next request; undefined when there is no bot test. */
  token: string | undefined;
  /** True when the button should wait for the test. */
  waiting: boolean;
  /** Tokens work once: get a new one after each attempt. */
  reset: () => void;
}

export function useCaptcha(): Captcha {
  return { element: null, token: undefined, waiting: false, reset: () => undefined };
}
