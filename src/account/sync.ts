import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { isSwitching, MAIN, onLearnerSwitch, progressOf, switchLearner, useLearners, type ChildProfile } from '../learners/store';
import { restore, useApp, type Data } from '../state/store';
import { supabase } from './supabase';

/**
 * Keeps every learner's progress in the account (the account holder's in `progress`, each
 * child's in `child_profiles`), so it follows them between devices, and works offline.
 * Every change is uploaded a moment later; a change that can't be uploaded (no connection) is
 * remembered as "not yet uploaded" and sent when the connection is back.
 * On sign-in the newer copy wins: the account's copy replaces the device's, unless the device has
 * changes made after the account's copy was saved (for example lessons done offline).
 */

let unsubscribe: (() => void) | null = null;
let offSwitch: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let userId: string | null = null;
let activeSession: Session | null = null;
/** The last profile fields sent, so the profile row is only updated when they change. */
let lastProfile = '';
/** The account's copy has been compared with the device's (false while offline at start-up). */
let firstSyncDone = false;

/** Per account on this device: learner id → when the device changed it without uploading yet. */
interface SyncMeta {
  dirty: Record<string, number>;
}
const metaKey = (uid: string) => `yiga-sync:${uid}`;
let meta: SyncMeta = { dirty: {} };

async function loadMeta(uid: string): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(metaKey(uid));
    if (!raw) return { dirty: {} };
    const parsed = JSON.parse(raw) as Partial<SyncMeta> & { dirtyAt?: number | null };
    // Older versions kept one time for the account holder only.
    if (parsed.dirty) return { dirty: parsed.dirty };
    return { dirty: parsed.dirtyAt ? { [MAIN]: parsed.dirtyAt } : {} };
  } catch {
    return { dirty: {} };
  }
}

function saveMeta() {
  if (!userId) return;
  AsyncStorage.setItem(metaKey(userId), JSON.stringify(meta)).catch(() => undefined);
}

function markDirty(id: string) {
  meta = { dirty: { ...meta.dirty, [id]: Date.now() } };
  saveMeta();
}

function markClean(id: string, uploadedFrom: number) {
  const at = meta.dirty[id];
  if (at === undefined || at > uploadedFrom) return; // changed again while it was on its way
  const dirty = { ...meta.dirty };
  delete dirty[id];
  meta = { dirty };
  saveMeta();
}

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** What the server needs for e-mails: name, language, the reminder and the last day practised. */
function profileFields(data: Data) {
  return {
    name: data.profile?.name ?? '',
    ui_lang: data.profile?.lang ?? 'en',
    reminder_on: data.settings.reminder?.on ?? false,
    reminder_hour: data.settings.reminder?.hour ?? 18,
    timezone: timeZone(),
    last_active_day: data.stats.lastActiveDay,
    tips_email: data.settings.tipsEmail ?? true,
  };
}

/** Sends one learner's progress. Returns false when it couldn't (offline). */
async function uploadLearner(id: string): Promise<boolean> {
  if (!supabase || !userId) return false;
  const uid = userId;
  const data = progressOf(id);
  if (!data) return true;
  const startedAt = Date.now();
  const now = new Date().toISOString();
  const { error } =
    id === MAIN
      ? await supabase.from('progress').upsert({ user_id: uid, data, updated_at: now })
      : await supabase.from('child_profiles').update({ data, updated_at: now }).eq('id', id).eq('user_id', uid);
  if (uid !== userId) return false;
  if (error) return false;
  markClean(id, startedAt);
  // Keep the profile row (used for reminder e-mails) in step with the account holder.
  if (id === MAIN && data.profile) {
    const fields = profileFields(data);
    const key = JSON.stringify(fields);
    if (key !== lastProfile) {
      const { error: profileError } = await supabase.from('profiles').update({ ...fields, updated_at: now }).eq('id', uid);
      if (!profileError) lastProfile = key;
    }
  }
  return true;
}

async function uploadDirty() {
  timer = null;
  for (const id of Object.keys(meta.dirty)) {
    const ok = await uploadLearner(id);
    if (!ok) {
      // Offline or a server hiccup: it stays marked as not uploaded; try again later.
      scheduleRetry();
      return;
    }
  }
}

function onChange() {
  if (isSwitching()) return;
  markDirty(useLearners.getState().active);
  schedule();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(uploadDirty, 1500);
}

function scheduleRetry() {
  if (retry) return;
  retry = setTimeout(() => {
    retry = null;
    if (!firstSyncDone && activeSession) startSync(activeSession);
    else if (Object.keys(meta.dirty).length) schedule();
  }, firstSyncDone ? 30_000 : 60_000);
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    uploadDirty();
  }
}

/** Back online (web), or back in the app (phones): send what is waiting, or finish the first sync. */
function onOnline() {
  if (!activeSession) return;
  if (!firstSyncDone) startSync(activeSession);
  else if (Object.keys(meta.dirty).length) schedule();
}

let appStateSub: { remove(): void } | null = null;

interface ChildRow {
  id: string;
  name: string;
  data: Partial<Data> | null;
  updated_at: string;
  created_at: string;
}

export async function startSync(session: Session) {
  if (!supabase) return;
  stopSync();
  activeSession = session;
  userId = session.user.id;
  const uid = userId;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', onOnline);
  } else appStateSub = AppState.addEventListener('change', (s) => (s !== 'active' ? flush() : onOnline()));
  // Switching learner: send the outgoing learner's changes first.
  offSwitch = onLearnerSwitch((phase) => {
    if (phase === 'before') flush();
  });

  meta = await loadMeta(uid);
  const [saved, profile, kids] = await Promise.all([
    supabase.from('progress').select('data, updated_at').eq('user_id', uid).maybeSingle(),
    supabase.from('profiles').select('name, ui_lang, created_at').eq('id', uid).maybeSingle(),
    supabase.from('child_profiles').select('id, name, data, updated_at, created_at').eq('user_id', uid).order('created_at'),
  ]);
  if (uid !== userId) return;

  if (saved.error || kids.error) {
    // Offline: carry on with the device's copies. Changes are kept and sent once the connection
    // is back, and the first sync is finished then.
    unsubscribe = useApp.subscribe(onChange);
    scheduleRetry();
    return;
  }
  firstSyncDone = true;

  // The children are the account's: take the list from the server.
  const rows = (kids.data ?? []) as ChildRow[];
  const children: ChildProfile[] = rows.map((r) => ({ id: r.id, name: r.name, createdAt: Date.parse(r.created_at) }));
  const learners = useLearners.getState();
  const known = new Set(children.map((c) => c.id));
  useLearners.setState({
    children,
    saved: Object.fromEntries(Object.entries(learners.saved).filter(([id]) => id === MAIN || known.has(id))),
  });
  if (learners.active !== MAIN && !known.has(learners.active)) switchLearner(MAIN);

  // For each learner, keep the newer copy: the account's, or the device's if it changed since.
  const cloud: Record<string, { data: Partial<Data> | null; at: number }> = {
    [MAIN]: { data: (saved.data?.data as Partial<Data> | undefined) ?? null, at: saved.data?.updated_at ? Date.parse(saved.data.updated_at as string) : 0 },
  };
  for (const r of rows) cloud[r.id] = { data: r.data, at: Date.parse(r.updated_at) };
  const active = useLearners.getState().active;
  for (const [id, c] of Object.entries(cloud)) {
    const deviceNewer = meta.dirty[id] !== undefined && meta.dirty[id] > c.at;
    if (deviceNewer) continue;
    if (c.data) {
      if (id === active) useApp.setState(restore(c.data));
      else useLearners.setState((s) => ({ saved: { ...s.saved, [id]: restore(c.data!) } }));
      markClean(id, Date.now());
    } else if (id === MAIN) {
      // No copy in the account yet: upload what this device has.
      markDirty(MAIN);
    }
  }

  // The profile row is the source of the account holder's name: it is set when the account is created.
  if (profile.data) {
    const p = profile.data;
    const apply = (local: Data['profile']) => ({
      name: p.name || local?.name || '',
      // A new account (nothing saved in it yet) keeps the language chosen on this device.
      lang: (!saved.data?.data && local?.lang) || ((p.ui_lang as 'en' | 'sv') ?? local?.lang ?? 'en'),
      createdAt: local?.createdAt ?? Date.parse(p.created_at),
    });
    if (active === MAIN) useApp.setState({ profile: apply(useApp.getState().profile) });
    else {
      const mainData = useLearners.getState().saved[MAIN];
      if (mainData) useLearners.setState((s) => ({ saved: { ...s.saved, [MAIN]: { ...mainData, profile: apply(mainData.profile) } } }));
    }
  }
  lastProfile = '';
  if (Object.keys(meta.dirty).length) await uploadDirty();
  unsubscribe = useApp.subscribe(onChange);
}

/** Creates a child profile in the account. Returns its id, or null when offline or at the limit. */
export async function createChildProfile(name: string): Promise<{ id: string; createdAt: number } | { error: 'offline' | 'limit' | 'family' }> {
  if (!supabase || !userId) return { error: 'offline' };
  const { data, error } = await supabase.from('child_profiles').insert({ user_id: userId, name: name.trim() }).select('id, created_at').single();
  if (error) return { error: error.message.includes('child_profile_limit') ? 'limit' : error.message.includes('family_plan_required') ? 'family' : 'offline' };
  return { id: data.id as string, createdAt: Date.parse(data.created_at as string) };
}

export async function renameChildProfile(id: string, name: string): Promise<boolean> {
  if (!supabase || !userId) return false;
  const { error } = await supabase.from('child_profiles').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', id);
  return !error;
}

export async function deleteChildProfile(id: string): Promise<boolean> {
  if (!supabase || !userId) return false;
  const { error } = await supabase.from('child_profiles').delete().eq('id', id);
  if (!error && meta.dirty[id] !== undefined) {
    const dirty = { ...meta.dirty };
    delete dirty[id];
    meta = { dirty };
    saveMeta();
  }
  return !error;
}

export function stopSync() {
  flush();
  unsubscribe?.();
  unsubscribe = null;
  offSwitch?.();
  offSwitch = null;
  firstSyncDone = false;
  if (retry) clearTimeout(retry);
  retry = null;
  appStateSub?.remove();
  appStateSub = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.removeEventListener('pagehide', flush);
    window.removeEventListener('online', onOnline);
  }
  userId = null;
  activeSession = null;
}
