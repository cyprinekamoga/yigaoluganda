import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { restore, snapshot, useApp, type Data } from '../state/store';
import { supabase } from './supabase';

/**
 * Keeps the learner's progress in their account, so it follows them between devices.
 * On sign-in the saved copy replaces what is on the device; if the account has none yet,
 * the device's progress is uploaded (so progress made before accounts existed is kept).
 * After that, every change is uploaded a moment later. The newest write wins.
 */

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let userId: string | null = null;
/** The last profile fields sent, so the profile row is only updated when they change. */
let lastProfile = '';

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
  const data = snapshot(useApp.getState());
  await supabase.from('progress').upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  // Keep the profile row (used for reminder e-mails) in step.
  if (!data.profile) return;
  const fields = profileFields(data);
  const key = JSON.stringify(fields);
  if (key !== lastProfile) {
    const { error } = await supabase.from('profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', userId);
    if (!error) lastProfile = key;
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(upload, 1500);
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    upload();
  }
}

export async function startSync(session: Session) {
  if (!supabase) return;
  stopSync();
  userId = session.user.id;
  const [{ data: saved }, { data: profile }] = await Promise.all([
    supabase.from('progress').select('data').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('name, ui_lang, created_at').eq('id', userId).maybeSingle(),
  ]);
  if (saved?.data) useApp.setState(restore(saved.data as Partial<Data>));
  // The profile row is the source of the name: it is set when the account is created.
  const local = useApp.getState().profile;
  if (profile) {
    useApp.setState({
      profile: {
        name: profile.name || local?.name || '',
        lang: (profile.ui_lang as 'en' | 'sv') ?? local?.lang ?? 'en',
        createdAt: local?.createdAt ?? Date.parse(profile.created_at),
      },
    });
  }
  lastProfile = '';
  if (!saved?.data) await upload();
  else schedule();
  unsubscribe = useApp.subscribe(schedule);
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('pagehide', flush);
  else appStateSub = AppState.addEventListener('change', (s) => s !== 'active' && flush());
}

let appStateSub: { remove(): void } | null = null;

export function stopSync() {
  flush();
  unsubscribe?.();
  unsubscribe = null;
  appStateSub?.remove();
  appStateSub = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('pagehide', flush);
  userId = null;
}
