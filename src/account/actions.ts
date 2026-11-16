import { Linking, Platform } from 'react-native';
import type { Lang } from '../content/types';
import type { Key } from '../i18n';
import { useApp } from '../state/store';
import { refreshSubscriptions, setRecovering, useAccount, refreshLicence } from './store';
import { inviteCode } from './invite';
import { supabase } from './supabase';
import { stopSync } from './sync';

/** Result of an account action: ok, or the i18n key of a message to show. */
export type Outcome = { ok: true } | { ok: false; error: Key };

const fail = (error: Key): Outcome => ({ ok: false, error });

/** Turns a Supabase error into a message the learner understands. */
function explain(e: unknown): Key {
  const err = e as { code?: string; message?: string; status?: number; name?: string } | null;
  const code = err?.code ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'auth.errWrong';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'auth.errExists';
  if (code === 'weak_password' || msg.includes('password should')) return 'auth.errWeak';
  if (code === 'email_not_confirmed') return 'auth.errConfirm';
  if (code === 'over_email_send_rate_limit' || err?.status === 429) return 'auth.errRate';
  if (code === 'otp_expired' || code === 'flow_state_expired' || msg.includes('has expired')) return 'auth.linkExpired';
  if (code === 'email_address_invalid' || code === 'validation_failed' || msg.includes('invalid email')) return 'auth.errEmail';
  if (err?.name === 'AuthRetryableFetchError' || msg.includes('fetch') || msg.includes('network')) return 'auth.errNetwork';
  return 'auth.errGeneric';
}

/** Where e-mail links (confirm account, reset password) bring the user back to. */
function returnUrl(path: string): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return undefined;
}

export async function signUp(name: string, email: string, password: string, lang: Lang): Promise<Outcome & { confirm?: boolean }> {
  if (!supabase) return fail('auth.errGeneric');
  if (!name.trim()) return fail('auth.errName');
  if (password.length < 8) return fail('auth.errWeak');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim(), ui_lang: lang }, emailRedirectTo: returnUrl('/subscribe') },
  });
  if (error) return fail(explain(error));
  // An existing, confirmed address comes back with no identities (Supabase hides that it exists).
  if (data.user && data.user.identities?.length === 0) return fail('auth.errExists');
  useApp.getState().start(name, lang);
  // Logged in straight away (no e-mail confirmation): on to the payment page.
  if (data.session) useAccount.setState({ payNext: true });
  return { ok: true, confirm: !data.session };
}

export async function resendConfirmation(email: string): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: returnUrl('/subscribe') } });
  return error ? fail(explain(error)) : { ok: true };
}

/**
 * The button on the page an e-mail link opens (/confirm). The e-mail carries a one-time code;
 * using it only when the person taps the button means mail scanners that open links ahead of
 * them (Gmail does) can't use it up first.
 */
export async function confirmFromLink(tokenHash: string, kind: 'email' | 'recovery' | 'email_change'): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  if (!tokenHash) return fail('auth.linkExpired');
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: kind });
  if (error) return fail(explain(error) === 'auth.errNetwork' ? 'auth.errNetwork' : 'auth.linkExpired');
  if (kind === 'recovery') setRecovering(true);
  else if (kind === 'email') useAccount.setState({ payNext: true });
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? fail(explain(error)) : { ok: true };
}

export async function sendPasswordReset(email: string): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: returnUrl('/reset-password') });
  // Don't reveal whether the address has an account; only report real failures.
  return error && explain(error) === 'auth.errNetwork' ? fail('auth.errNetwork') : { ok: true };
}

export async function updatePassword(password: string): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  if (password.length < 8) return fail('auth.errWeak');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(explain(error));
  setRecovering(false);
  return { ok: true };
}

/** Asks to move the account to a new e-mail address. Supabase e-mails a link; the address changes once it is clicked. */
export async function changeEmail(email: string): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  const clean = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return fail('auth.errEmail');
  const { error } = await supabase.auth.updateUser({ email: clean }, { emailRedirectTo: returnUrl('/settings') });
  if (error) return fail(explain(error));
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  stopSync();
  setRecovering(false);
  await supabase.auth.signOut();
}

/** Calls one of our Edge Functions as the signed-in user. */
async function call<T>(name: string, body: object = {}): Promise<{ data: T | null; error: Key | null }> {
  if (!supabase) return { data: null, error: 'auth.errGeneric' };
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) return { data: null, error: explain(error) };
  return { data, error: null };
}

function open(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(url);
  else Linking.openURL(url);
}

/** Sends the learner to Stripe Checkout (with a friend's invite code, if they came with one). */
export async function startCheckout(lang: Lang): Promise<Outcome> {
  const { data, error } = await call<{ url?: string; error?: string }>('create-checkout', { lang, ref: (await inviteCode()) ?? undefined });
  if (error || !data?.url) {
    // Already paid (for example in another tab): just unlock.
    if ((await refreshSubscriptions()).length) return { ok: true };
    return fail(error ?? 'auth.errGeneric');
  }
  open(data.url);
  return { ok: true };
}

/** Joins a school's class with the teacher's code (the course then opens without paying). */
export async function joinClass(code: string): Promise<Outcome> {
  if (!supabase) return fail('auth.errGeneric');
  const { data, error } = await supabase.rpc('join_class', { p_code: code });
  if (error) return fail(explain(error));
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  if (!r.ok) return fail(r.error === 'full' ? 'class.errFull' : r.error === 'expired' ? 'class.errExpired' : r.error === 'no_class' ? 'class.errNoClass' : 'auth.errGeneric');
  await refreshLicence();
  return { ok: true };
}

/** The learner's own invite code (refer a friend), created the first time. */
export async function getInviteCode(): Promise<{ code: string } | { error: Key }> {
  const { data, error } = await call<{ code?: string }>('referral-code');
  if (error || !data?.code) return { error: error ?? 'auth.errGeneric' };
  return { code: data.code };
}

/** Opens Stripe's customer portal: cancel, change card, receipts. */
export async function openBillingPortal(lang: Lang): Promise<Outcome> {
  const { data, error } = await call<{ url: string }>('billing-portal', { lang });
  if (error || !data?.url) return fail(error ?? 'auth.errGeneric');
  open(data.url);
  return { ok: true };
}

/** The EU withdrawal button: ends the subscription now with a full refund (within 14 days). */
export async function withdraw(): Promise<Outcome> {
  const { error } = await call<{ ok: boolean }>('withdraw');
  await refreshSubscriptions();
  return error ? fail(error) : { ok: true };
}

/** Deletes the account and everything in it. */
export async function deleteAccount(): Promise<Outcome> {
  const { error } = await call<{ ok: boolean }>('delete-account');
  if (error) return fail(error);
  stopSync();
  await supabase?.auth.signOut({ scope: 'local' });
  useApp.getState().reset();
  return { ok: true };
}
