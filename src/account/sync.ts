import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { restore, snapshot, useApp, type Data } from '../state/store';
import { supabase } from './supabase';

/**
 * Keeps the learner's progress in their account, so it follows them between devices, and works
 * offline. Every change is uploaded a moment later; a change that can't be uploaded (no connection)
 * is remembered as "not yet uploaded" and sent when the connection is back.
 * On sign-in the newer copy wins: the account's copy replaces the device's, unless the device has
 * changes made after the account's copy was saved (for example lessons done offline).
 */

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let userId: string | null = null;
let activeSession: Session | null = null;
/** The last profile fields sent, so the profile row is only updated when they change. */
let lastProfile = '';
/** The account's copy has been compared with the device's (false while offline at start-up). */
let firstSyncDone = false;

/** Per account on this device: when the device last changed something it hasn't uploaded yet. */
interface SyncMeta {
  dirtyAt: number | null;
}
const metaKey = (uid: string) => `yiga-sync:${uid}`;
let meta: SyncMeta = { dirtyAt: null };

async function loadMeta(uid: string): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(metaKey(uid));
    return raw ? { dirtyAt: null, ...(JSON.parse(raw) as Partial<SyncMeta>) } : { dirtyAt: null };
  } catch {
    return { dirtyAt: null };
  }
}

function saveMeta() {
  if (!userId) return;
  AsyncStorage.setItem(metaKey(userId), JSON.stringify(meta)).catch(() => undefined);
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
  };
}

async function upload() {
  timer = null;
  if (!supabase || !userId) return;
  const uid = userId;
  const data = snapshot(useApp.getState());
  const startedAt = Date.now();
  const { error } = await supabase.from('progress').upsert({ user_id: uid, data, updated_at: new Date().toISOString() });
  if (uid !== userId) return;
  if (error) {
    // Offline or a server hiccup: the change stays marked as not uploaded; try again later.
    scheduleRetry();
    return;
  }
  // Uploaded, unless something changed again while it was on its way.
  if (meta.dirtyAt !== null && meta.dirtyAt <= startedAt) {
    meta = { dirtyAt: null };
    saveMeta();
  }
  // Keep the profile row (used for reminder e-mails) in step.
  if (!data.profile) return;
  const fields = profileFields(data);
  const key = JSON.stringify(fields);
  if (key !== lastProfile) {
    const { error: profileError } = await supabase.from('profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', uid);
    if (!profileError) lastProfile = key;
  }
}

function onChange() {
  meta = { dirtyAt: Date.now() };
  saveMeta();
  schedule();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(upload, 1500);
}

function scheduleRetry() {
  if (retry) return;
  retry = setTimeout(() => {
    retry = null;
    if (meta.dirtyAt !== null) schedule();
  }, 30_000);
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    upload();
  }
}

/** Back online (web): send what is waiting, or finish the first sync that failed. */
function onOnline() {
  if (!activeSession) return;
  if (!firstSyncDone) startSync(activeSession);
  else if (meta.dirtyAt !== null) schedule();
}

let appStateSub: { remove(): void } | null = null;

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

  meta = await loadMeta(uid);
  const [saved, profile] = await Promise.all([
    supabase.from('progress').select('data, updated_at').eq('user_id', uid).maybeSingle(),
    supabase.from('profiles').select('name, ui_lang, created_at').eq('id', uid).maybeSingle(),
  ]);
  if (uid !== userId) return;

  if (saved.error) {
    // Offline: carry on with the device's copy. Changes are kept and sent once the connection is
    // back, and the first sync is finished then (see onOnline).
    unsubscribe = useApp.subscribe(onChange);
    scheduleFirstSyncRetry();
    return;
  }
  firstSyncDone = true;

  const cloudAt = saved.data?.updated_at ? Date.parse(saved.data.updated_at as string) : 0;
  const deviceNewer = meta.dirtyAt !== null && meta.dirtyAt > cloudAt;
  if (saved.data?.data && !deviceNewer) useApp.setState(restore(saved.data.data as Partial<Data>));

  // The profile row is the source of the name: it is set when the account is created.
  const local = useApp.getState().profile;
  if (profile.data) {
    useApp.setState({
      profile: {
        name: profile.data.name || local?.name || '',
        // A new account (nothing saved in it yet) keeps the language chosen on this device.
        lang: (!saved.data?.data && local?.lang) || ((profile.data.ui_lang as 'en' | 'sv') ?? local?.lang ?? 'en'),
        createdAt: local?.createdAt ?? Date.parse(profile.data.created_at),
      },
    });
  }
  lastProfile = '';
  if (!saved.data?.data || deviceNewer) {
    meta = { dirtyAt: meta.dirtyAt ?? Date.now() };
    await upload();
  } else {
    meta = { dirtyAt: null };
    saveMeta();
  }
  unsubscribe = useApp.subscribe(onChange);
}

/** Phones have no "online" event: try the first sync again every minute until it works. */
function scheduleFirstSyncRetry() {
  if (retry) clearTimeout(retry);
  retry = setTimeout(() => {
    retry = null;
    if (activeSession && !firstSyncDone) startSync(activeSession);
  }, 60_000);
}

export function stopSync() {
  flush();
  unsubscribe?.();
  unsubscribe = null;
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
