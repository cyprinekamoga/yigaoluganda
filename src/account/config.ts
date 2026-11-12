/**
 * Accounts and payments are on when the build has a Supabase project
 * (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, both public values).
 * Without them the app runs as before: no account, progress on the device only. That is how
 * development builds and the offline end-to-end test run.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const ACCOUNTS = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** The landing page, which holds the terms and the privacy policy. */
export const SITE_URL = 'https://yigaoluganda.com';
