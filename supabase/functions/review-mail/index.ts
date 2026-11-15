// Mail for the people who review Yiga Oluganda, sent through Resend.
//   POST { type: 'report', id }  from a database trigger: e-mails a new "Report a mistake".
//   POST { type: 'daily' }       from pg_cron every morning: deletes recordings older than 30 days
//                                and e-mails a summary of what is waiting for review.
// Both need the x-cron-secret header (checked against the database). Needs RESEND_API_KEY;
// without it nothing is e-mailed (the clean-up still runs). Deployed without Supabase login.
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.yigaoluganda.com';
const FROM = Deno.env.get('REVIEW_FROM') ?? 'Yiga Oluganda <ngaali@yigaoluganda.com>';
const TO = Deno.env.get('REVIEW_EMAIL') ?? 'info@nordvra.se';
const KEEP_DAYS = 30;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const KINDS: Record<string, string> = {
  translation: 'The translation is wrong',
  luganda: 'The Luganda is wrong',
  audio: 'The audio is wrong',
  typo: 'A typo',
  other: 'Something else',
};

async function send(subject: string, lines: [string, string][], intro: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return false;
  const rows = lines.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#A8807A;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#250104;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#FFF1EC">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#CDF73D;margin:0 0 12px">Yiga Oluganda · Review</p>
<p style="font-size:17px;line-height:1.5;margin:0 0 16px">${esc(intro)}</p>
<table style="font-size:15px;line-height:1.4;border-collapse:collapse;margin:0 0 24px">${rows}</table>
<a href="${APP_URL}/review" style="display:inline-block;background:#D71A06;color:#FFF1EC;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">Open the review list</a>
</div></body></html>`;
  const text = `${intro}\n\n${lines.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${APP_URL}/review`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject, html, text }),
  });
  if (!res.ok) console.error('resend', res.status, await res.text());
  return res.ok;
}

async function mailReport(id: string) {
  const { data: r } = await admin.from('reports').select('*').eq('id', id).maybeSingle();
  if (!r) return { sent: false, note: 'no such report' };
  const item = [r.item_type, r.item_id].filter(Boolean).join(' ');
  const sent = await send(
    `Mistake reported: ${KINDS[r.kind] ?? r.kind}${r.item_id ? ` (${r.item_id})` : ''}`,
    [
      ['What', KINDS[r.kind] ?? r.kind],
      ['Where', item || '–'],
      ['Lesson', r.lesson_id ?? '–'],
      ['Note', r.note || '–'],
      ['App language', r.lang],
      ['Device', [r.platform, r.app_version].filter(Boolean).join(' · ') || '–'],
    ],
    'A learner reported something that looks wrong in the course.',
  );
  return { sent };
}

async function daily() {
  // 1. Recordings are kept for 30 days; the reviewer's answer stays.
  const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
  const { data: old } = await admin.from('feedback_requests').select('id, audio_path, status').lt('created_at', cutoff).not('audio_path', 'is', null).limit(1000);
  let removed = 0;
  if (old?.length) {
    const paths = old.map((r) => r.audio_path as string);
    const { error } = await admin.storage.from('recordings').remove(paths);
    if (error) console.error('storage remove', error.message);
    else {
      removed = paths.length;
      for (const r of old) {
        await admin.from('feedback_requests').update({ audio_path: null, status: r.status === 'open' ? 'expired' : r.status }).eq('id', r.id);
      }
    }
  }

  // 2. What is waiting for the reviewers.
  const [{ count: recordings }, { count: reports }] = await Promise.all([
    admin.from('feedback_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  let sent = false;
  if ((recordings ?? 0) + (reports ?? 0) > 0) {
    sent = await send(
      `Waiting for review: ${recordings ?? 0} recording(s), ${reports ?? 0} report(s)`,
      [
        ['Recordings waiting for feedback', String(recordings ?? 0)],
        ['Mistake reports still open', String(reports ?? 0)],
      ],
      'Good morning! This is what learners are waiting for.',
    );
  }
  return { removed, recordings: recordings ?? 0, reports: reports ?? 0, sent };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Not found', { status: 404 });
  const { data: ok } = await admin.rpc('reminders_secret_ok', { secret: req.headers.get('x-cron-secret') ?? '' });
  if (!ok) return new Response('Forbidden', { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { type?: string; id?: string };
  if (body.type === 'report' && body.id) return Response.json(await mailReport(body.id));
  if (body.type === 'daily') return Response.json(await daily());
  return Response.json({ error: 'unknown type' }, { status: 400 });
});
