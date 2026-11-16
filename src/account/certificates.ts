import { useLearners } from '../learners/store';
import { supabase } from './supabase';

/**
 * Asks the account's server for a part's certificate. The server checks the subscription and
 * the learner (the account holder or one of their children), and gives back the code. Asking
 * again returns the same code, with the name as now given.
 */
export type IssueError = 'offline' | 'no_access' | 'signed_out';

export async function issueCertificate(p: {
  part: number;
  name: string;
  lang: 'en' | 'sv';
  phrases: number;
}): Promise<{ code: string; issuedAt: number } | { error: IssueError }> {
  if (!supabase) return { error: 'signed_out' };
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return { error: 'signed_out' };
  const { data: code, error } = await supabase.rpc('issue_certificate', {
    p_learner: useLearners.getState().active,
    p_name: p.name.trim().slice(0, 60),
    p_part: p.part,
    p_lang: p.lang,
    p_phrases: p.phrases,
  });
  if (error || typeof code !== 'string') return { error: error?.message.includes('no_access') ? 'no_access' : 'offline' };
  // The date it was first issued (asking again keeps the original date).
  const { data: row } = await supabase.from('certificates').select('issued_at').eq('code', code).maybeSingle();
  const issuedAt = row?.issued_at ? Date.parse(row.issued_at as string) : Date.now();
  return { code, issuedAt };
}
