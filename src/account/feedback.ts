import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * "Report a mistake" and feedback from native speakers, for learners and for the people who
 * review (the owner and the reviewers the owner adds). The database checks every permission;
 * these helpers only shape the calls. Each returns null or false when offline.
 */

async function uid(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------------------------------------------------------------------------------------------
// Report a mistake
// ---------------------------------------------------------------------------------------------

export type ReportKind = 'translation' | 'luganda' | 'audio' | 'typo' | 'other';
export const REPORT_KINDS: ReportKind[] = ['translation', 'luganda', 'audio', 'typo', 'other'];
export type ItemType = 'phrase' | 'sentence' | 'lesson' | 'dialogue' | 'tip' | 'other';
export interface ReportItem {
  type: ItemType;
  id?: string;
  lessonId?: string;
}

export async function sendReport(item: ReportItem, kind: ReportKind, note: string, lang: 'en' | 'sv'): Promise<'ok' | 'limit' | 'error'> {
  const me = await uid();
  if (!supabase || !me) return 'error';
  const { error } = await supabase.from('reports').insert({
    user_id: me,
    kind,
    item_type: item.type,
    item_id: item.id?.slice(0, 60) ?? null,
    lesson_id: item.lessonId?.slice(0, 60) ?? null,
    note: note.trim().slice(0, 1000) || null,
    lang,
    platform: Platform.OS.slice(0, 20),
    app_version: (Constants.expoConfig?.version ?? '').slice(0, 20) || null,
  });
  if (error) return error.message.includes('too_many_reports') ? 'limit' : 'error';
  return 'ok';
}

// ---------------------------------------------------------------------------------------------
// Feedback from native speakers
// ---------------------------------------------------------------------------------------------

export type Rating = 'good' | 'almost' | 'again';
export const RATINGS: Rating[] = ['good', 'almost', 'again'];

export interface FeedbackRow {
  id: string;
  phrase_id: string;
  status: 'open' | 'answered' | 'expired';
  rating: Rating | null;
  tip: string | null;
  created_at: string;
  answered_at: string | null;
  seen_at: string | null;
}

export type AskError = 'offline' | 'no_access' | 'too_many' | 'signed_out' | 'too_big' | 'full';
/** The storage bucket takes up to 2 MB per recording (about two minutes of speech). */
const MAX_BYTES = 2 * 1024 * 1024;

const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

/** Sends the learner's recording of a phrase to the review list. */
export async function askNativeSpeaker(phraseId: string, uri: string, lang: 'en' | 'sv'): Promise<{ ok: true } | { error: AskError }> {
  const me = await uid();
  if (!supabase || !me) return { error: 'signed_out' };
  let blob: Blob;
  try {
    blob = await (await fetch(uri)).blob();
  } catch {
    return { error: 'offline' };
  }
  if (blob.size > MAX_BYTES) return { error: 'too_big' };
  // "audio/webm;codecs=opus" → "audio/webm"; phones record .m4a.
  let type = (blob.type || '').split(';')[0].trim().toLowerCase();
  if (!EXT[type]) type = uri.endsWith('.m4a') || Platform.OS !== 'web' ? 'audio/mp4' : 'audio/webm';
  const path = `${me}/${phraseId.replace(/[^a-z0-9-]/gi, '')}-${Date.now()}.${EXT[type]}`;
  // Raw bytes with the plain type: a Blob would go as a form whose part keeps the browser's
  // "audio/webm;codecs=opus", which the bucket's list of audio types may not accept.
  const body = typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer() : new Blob([blob], { type });
  const up = await supabase.storage.from('recordings').upload(path, body, { contentType: type, upsert: false });
  // The storage rules allow 20 recordings per learner at a time (old ones are cleared daily).
  if (up.error) return { error: /row-level security|policy|403|Unauthorized/i.test(up.error.message) ? 'full' : 'offline' };
  const { error } = await supabase.rpc('request_feedback', { p_phrase: phraseId, p_lang: lang, p_audio_path: path });
  if (error) {
    await supabase.storage.from('recordings').remove([path]);
    if (error.message.includes('too_many_waiting')) return { error: 'too_many' };
    if (error.message.includes('no_access')) return { error: 'no_access' };
    return { error: 'offline' };
  }
  return { ok: true };
}

/** The learner's own requests, newest first. */
export async function myFeedback(): Promise<FeedbackRow[] | null> {
  const me = await uid();
  if (!supabase || !me) return null;
  const { data, error } = await supabase
    .from('feedback_requests')
    .select('id, phrase_id, status, rating, tip, created_at, answered_at, seen_at')
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(50);
  return error ? null : (data as FeedbackRow[]);
}

export async function markFeedbackSeen(): Promise<void> {
  await supabase?.rpc('mark_feedback_seen');
}

// ---------------------------------------------------------------------------------------------
// For reviewers
// ---------------------------------------------------------------------------------------------

export interface OpenRequest extends FeedbackRow {
  lang: 'en' | 'sv';
  audio_path: string | null;
}

export async function openRequests(): Promise<OpenRequest[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('feedback_requests')
    .select('id, phrase_id, status, rating, tip, created_at, answered_at, seen_at, lang, audio_path')
    .eq('status', 'open')
    .order('created_at', { ascending: true })
    .limit(50);
  return error ? null : (data as OpenRequest[]);
}

/** A short-lived link to a recording (the bucket is private). */
export async function recordingUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from('recordings').createSignedUrl(path, 600);
  return error ? null : data.signedUrl;
}

export async function answerFeedback(id: string, rating: Rating, tip: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('answer_feedback', { p_id: id, p_rating: rating, p_tip: tip.trim().slice(0, 500) });
  return !error;
}

export interface ReportRow {
  id: string;
  kind: ReportKind;
  item_type: ItemType;
  item_id: string | null;
  lesson_id: string | null;
  note: string | null;
  lang: 'en' | 'sv';
  platform: string | null;
  app_version: string | null;
  created_at: string;
}

export async function openReports(): Promise<ReportRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('reports')
    .select('id, kind, item_type, item_id, lesson_id, note, lang, platform, app_version, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: true })
    .limit(100);
  return error ? null : (data as ReportRow[]);
}

export async function resolveReport(id: string, status: 'fixed' | 'not_a_mistake'): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('resolve_report', { p_id: id, p_status: status });
  return !error;
}

export interface ReviewerRow {
  email: string;
  role: 'owner' | 'reviewer';
  added_at: string;
}

export async function listReviewers(): Promise<ReviewerRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('list_reviewers');
  return error ? null : (data as ReviewerRow[]);
}

/** Adds or removes a reviewer by e-mail (owner only). */
export async function setReviewer(email: string, on: boolean): Promise<'added' | 'removed' | 'no_account' | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('set_reviewer', { p_email: email.trim(), p_on: on });
  return error ? null : (data as 'added' | 'removed' | 'no_account');
}

// ---------------------------------------------------------------------------------------------
// The owner's dashboard
// ---------------------------------------------------------------------------------------------

export interface OwnerStats {
  accounts: number;
  new_today: number;
  new_7d: number;
  new_30d: number;
  signups_by_day: { day: string; n: number }[];
  paying: number;
  paying_by_currency: Record<string, number>;
  past_due: number;
  ending: number;
  new_subs_30d: number;
  cancelled_30d: number;
  active_7d: number;
  reminders_on: number;
  children: number;
  certificates: number;
  open_feedback: number;
  answered_feedback: number;
  open_reports: number;
  top_reported: { item_type: ItemType; item_id: string | null; n: number; open: number }[];
}

export async function ownerStats(): Promise<OwnerStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('owner_stats');
  return error ? null : (data as OwnerStats);
}
