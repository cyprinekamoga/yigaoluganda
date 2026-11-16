import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { resetLearners } from '../learners/store';
import { useApp } from '../state/store';
import { hasAccess, offlineRows, type SubscriptionRow } from './access';
import { ACCOUNTS } from './config';
import { OPENING_LINK, supabase } from './supabase';
import { startSync, stopSync } from './sync';

interface AccountState {
  /** The first session check has finished (always true without accounts). */
  ready: boolean;
  session: Session | null;
  subscriptions: SubscriptionRow[];
  /** Opened from a password-reset e-mail: the user must choose a new password. */
  recovering: boolean;
  /** The app was opened from an e-mail link that had expired or was already used. */
  linkError: boolean;
  /** Opened from an e-mail's link to /confirm, and the button hasn't been used yet. */
  confirmLink: boolean;
  /** The account was just created (or confirmed): go straight on to the payment page. */
  payNext: boolean;
  /** Reviews recordings and reports ('owner' also adds reviewers), or null for everyone else. */
  role: 'owner' | 'reviewer' | null;
}

/** Kept for the browser tab, so reloading the "new password" page doesn't lose it. */
const RECOVERY_KEY = 'yiga-recovering';
function savedRecovery(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
}

export const useAccount = create<AccountState>(() => ({
  ready: !ACCOUNTS,
  session: null,
  subscriptions: [],
  recovering: ACCOUNTS && (OPENING_LINK.recovery || savedRecovery()),
  linkError: ACCOUNTS && Boolean(OPENING_LINK.error),
  confirmLink: ACCOUNTS && OPENING_LINK.confirm,
  payNext: false,
  role: null,
}));

/** Starts or ends "choose a new password" (ends after saving it, or on logging out). */
export function setRecovering(on: boolean) {
  useAccount.setState({ recovering: on });
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (on) sessionStorage.setItem(RECOVERY_KEY, '1');
    else sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Private browsing can refuse storage; the flag then lasts until the page is reloaded.
  }
}
if (useAccount.getState().recovering) setRecovering(true);

// Listen from the moment this file loads. The client reads a reset link as soon as it is created
// and announces PASSWORD_RECOVERY only once: a listener added later (after the first render) can
// miss it on a fast connection, and the reset link then just logs the user in.
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setRecovering(true);
});

export const selectSignedIn = (s: AccountState) => Boolean(s.session);
export const selectAccess = (s: AccountState) => hasAccess(s.subscriptions);

const subsKey = (uid: string) => `yiga-subs:${uid}`;

/**
 * Reads the user's subscriptions again (after paying, cancelling or withdrawing). The last answer
 * is kept on the device, so a paying learner can keep learning offline until the paid period ends.
 */
export async function refreshSubscriptions(): Promise<SubscriptionRow[]> {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, current_period_end, cancel_at_period_end, created_at, currency')
    .eq('user_id', uid);
  if (error) {
    const current = useAccount.getState().subscriptions;
    if (current.length) return current;
    try {
      const saved = await AsyncStorage.getItem(subsKey(uid));
      const rows = offlineRows(saved ? (JSON.parse(saved) as SubscriptionRow[]) : [], Date.now());
      if (useAccount.getState().session?.user.id === uid) useAccount.setState({ subscriptions: rows });
      return rows;
    } catch {
      return [];
    }
  }
  useAccount.setState({ subscriptions: data ?? [] });
  AsyncStorage.setItem(subsKey(uid), JSON.stringify(data ?? [])).catch(() => undefined);
  return data ?? [];
}

/** Whether this account reviews recordings and reports (see the reviewers table). */
async function refreshRole(uid: string) {
  if (!supabase) return;
  const { data } = await supabase.from('reviewers').select('role').eq('user_id', uid).maybeSingle();
  if (useAccount.getState().session?.user.id === uid) useAccount.setState({ role: (data?.role as 'owner' | 'reviewer' | undefined) ?? null });
}

let currentUser: string | null = null;

/** The account loading for the current user (subscription, progress, role), while it runs. */
let loading: Promise<unknown> | null = null;

async function applySession(session: Session | null) {
  const uid = session?.user.id ?? null;
  // A reset link that logged nobody in (expired, already used) must not ask for a new password later.
  if (!session && useAccount.getState().recovering) setRecovering(false);
  if (uid !== currentUser) {
    // A different person (or nobody) on this device: start from their own saved progress.
    if (currentUser) {
      stopSync();
      resetLearners();
      useApp.getState().reset();
    }
    currentUser = uid;
    useAccount.setState({ session, subscriptions: [], role: null });
    // Never let a failed step keep the app from opening.
    loading = session ? Promise.allSettled([refreshSubscriptions(), startSync(session), refreshRole(session.user.id)]) : null;
    await loading;
  } else {
    useAccount.setState({ session });
    // At start-up the saved login is announced twice. The second time must not mark the account
    // ready before the first has loaded the subscription, or a paying learner's deep link (a lesson,
    // a certificate, the review list) is sent to the start page as if they had no subscription.
    await loading;
  }
  useAccount.setState({ ready: true });
}

let started = false;

/** Call once at start-up: restores the login and follows sign-in and sign-out. */
export function startAccount() {
  if (!supabase || started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => applySession(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase advises not to call it again from inside this callback, so defer.
    setTimeout(() => applySession(session), 0);
  });
}
