/**
 * "Continue with Google". On the web it uses Google's own button (google.web.ts); the phone apps
 * would need Google sign-in set up for iOS and Android first, so there it is not offered yet.
 */
import type { Key } from '../i18n';

/** How a sign-in went; `unavailable` means Google's script couldn't load (blocked or offline). */
export type GoogleResult = { ok: true } | { ok: false; error: Key } | { ok: false; unavailable: true };

export interface GoogleButtonOptions {
  lang: 'en' | 'sv';
  /** Google's wording on the button. */
  text: 'signup_with' | 'continue_with' | 'signin_with';
}

export const googleAvailable = false;

export async function mountGoogleButton(_el: unknown, _options: GoogleButtonOptions, _done: (r: GoogleResult) => void): Promise<void> {}
