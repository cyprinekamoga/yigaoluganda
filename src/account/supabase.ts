import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { ACCOUNTS, SUPABASE_KEY, SUPABASE_URL } from './config';

/**
 * What the address bar said when the web app opened, read before the Supabase client clears it.
 * A password-reset link arrives as …#access_token=…&type=recovery; a link that has expired or was
 * already used (some mail apps open links to scan them) arrives as …#error_code=otp_expired&….
 */
function readOpeningLink(): { recovery: boolean; error: string | null; confirm: boolean } {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location) return { recovery: false, error: null, confirm: false };
  const params = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
  // The e-mails' links open /confirm (a page with a button); the hash form is Supabase's older one.
  const confirm = window.location.pathname.replace(/\/+$/, '') === '/confirm';
  return { recovery: !confirm && params.get('type') === 'recovery', error: params.get('error_code') ?? params.get('error'), confirm };
}
export const OPENING_LINK = readOpeningLink();

/**
 * Removes the login (or the error) an e-mail link put in the address bar, so it isn't left in the
 * browser's history. Supabase clears it too, but the router can write its first copy of the
 * address back, so this runs once the app has settled.
 */
export function clearOpeningLink() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location) return;
  const { hash, pathname, search } = window.location;
  if (/(^|[#&])(access_token|refresh_token|error_code|error)=/.test(hash)) window.history.replaceState(window.history.state, '', pathname + search);
}

/** The Supabase client, or null when the build has no accounts (see config.ts). */
export const supabase: SupabaseClient | null = ACCOUNTS
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        // The web uses the browser's localStorage; phones use AsyncStorage.
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        // On the web, links from e-mails (confirm account, reset password) log the user in.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

// Keep the login fresh only while the app is in the foreground (phones).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
