import { snapshot, useApp } from '../state/store';
import { supabase } from './supabase';

/**
 * "Download my data" (the right to data portability, GDPR article 20): everything the account
 * holds about the learner, read with their own login, as one JSON document. Payment details are
 * kept by Stripe and are not part of it (receipts come from Stripe by e-mail).
 */
export async function collectMyData(): Promise<string | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  if (!user) return null;
  const uid = user.id;
  const read = async (table: string, columns = '*', key = 'user_id') => {
    const { data, error } = await supabase!.from(table).select(columns).eq(key, uid);
    if (error) throw error;
    return data;
  };
  try {
    const [profile, progress, children, certificates, subscriptions, feedback, reports] = await Promise.all([
      read('profiles', '*', 'id'),
      read('progress', 'data, updated_at'),
      read('child_profiles', 'id, name, data, created_at, updated_at'),
      read('certificates', 'code, learner, learner_name, part, lang, phrases, issued_at'),
      read('subscriptions', 'status, current_period_end, cancel_at_period_end, created_at, currency'),
      read('feedback_requests', 'phrase_id, lang, status, rating, tip, created_at, answered_at'),
      read('reports', 'kind, item_type, item_id, lesson_id, note, lang, status, created_at, resolved_at'),
    ]);
    const { data: classes } = await supabase.rpc('my_licence');
    const doc = {
      exported_at: new Date().toISOString(),
      about: 'Everything Yiga Oluganda keeps about your account. Payment details are kept by Stripe.',
      account: {
        email: user.email,
        created_at: user.created_at,
        sign_in_methods: (user.identities ?? []).map((i) => i.provider),
      },
      profile: profile?.[0] ?? null,
      progress: progress?.[0] ?? null,
      this_device: snapshot(useApp.getState()),
      children,
      certificates,
      subscriptions,
      feedback_from_native_speakers: feedback,
      reported_mistakes: reports,
      school_classes: classes ?? [],
    };
    return JSON.stringify(doc, null, 2);
  } catch {
    return null;
  }
}
