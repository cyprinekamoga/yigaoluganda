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
let lastName = '';
let lastLang = '';

async function upload() {
  timer = null;
  if (!supabase || !userId) return;
  const data = snapshot(useApp.getState());
  await supabase.from('progress').upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  // Keep the profile row (used for e-mails) in step with the name and language.
  const p = data.profile;
  if (p && (p.name !== lastName || p.lang !== lastLang)) {
    lastName = p.name;
    lastLang = p.lang;
    await supabase.from('profiles').update({ name: p.name, ui_lang: p.lang, updated_at: new Date().toISOString() }).eq('id', userId);
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
  lastName = useApp.getState().profile?.name ?? '';
  lastLang = useApp.getState().profile?.lang ?? '';
  if (!saved?.data) await upload();
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
