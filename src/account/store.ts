import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useApp } from '../state/store';
import { hasAccess, type SubscriptionRow } from './access';
import { ACCOUNTS } from './config';
import { supabase } from './supabase';
import { startSync, stopSync } from './sync';

interface AccountState {
  /** The first session check has finished (always true without accounts). */
  ready: boolean;
  session: Session | null;
  subscriptions: SubscriptionRow[];
  /** Opened from a password-reset e-mail: the user must choose a new password. */
  recovering: boolean;
}

export const useAccount = create<AccountState>(() => ({
  ready: !ACCOUNTS,
  session: null,
  subscriptions: [],
  recovering: false,
}));

export const selectSignedIn = (s: AccountState) => Boolean(s.session);
export const selectAccess = (s: AccountState) => hasAccess(s.subscriptions);

/** Reads the user's subscriptions again (after paying, cancelling or withdrawing). */
export async function refreshSubscriptions(): Promise<SubscriptionRow[]> {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, current_period_end, cancel_at_period_end, created_at, currency')
    .eq('user_id', uid);
  if (error) return useAccount.getState().subscriptions;
  useAccount.setState({ subscriptions: data ?? [] });
  return data ?? [];
}

let currentUser: string | null = null;

async function applySession(session: Session | null) {
  const uid = session?.user.id ?? null;
  if (uid !== currentUser) {
    // A different person (or nobody) on this device: start from their own saved progress.
    if (currentUser) {
      stopSync();
      useApp.getState().reset();
    }
    currentUser = uid;
    useAccount.setState({ session, subscriptions: [] });
    if (session) await Promise.all([refreshSubscriptions(), startSync(session)]);
  } else {
    useAccount.setState({ session });
  }
  useAccount.setState({ ready: true });
}

let started = false;

/** Call once at start-up: restores the login and follows sign-in and sign-out. */
export function startAccount() {
  if (!supabase || started) return;
  started = true;
  // A password-reset link opens the app already logged in; send it straight to "new password".
  if (typeof window !== 'undefined' && window.location?.hash?.includes('type=recovery')) useAccount.setState({ recovering: true });
  supabase.auth.getSession().then(({ data }) => applySession(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') useAccount.setState({ recovering: true });
    // Supabase advises not to call it again from inside this callback, so defer.
    setTimeout(() => applySession(session), 0);
  });
}
