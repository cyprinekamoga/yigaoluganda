/**
 * Accounts and payments are on when the build has a Supabase project
 * (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, both public values).
 * Without them the app runs as before: no account, progress on the device only. That is how
 * development builds and the offline end-to-end test run.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const ACCOUNTS = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Google's public client id for "Continue with Google" (web). Without it the button is hidden. */
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/** The landing page, which holds the terms and the privacy policy. */
export const SITE_URL = 'https://yigaoluganda.com';
/** The web app's address, for links people share (class and family invites). */
export const APP_URL = 'https://app.yigaoluganda.com';

/** Where learners write to us (forwarded to the company's inbox). Same as on the landing page. */
export const SUPPORT_EMAIL = 'hello@yigaoluganda.com';
