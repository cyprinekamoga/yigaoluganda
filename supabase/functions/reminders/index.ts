// Daily reminder e-mails (web learners), sent through Resend.
//   POST from pg_cron with the x-cron-secret header → e-mails everyone due a reminder this hour.
//   GET or POST with ?u=<user id>&s=<signature> → one-click unsubscribe (link in every e-mail).
// Needs the secret RESEND_API_KEY; without it nothing is sent. Deployed without Supabase login:
// the cron secret or the signature is checked instead.
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.yigaoluganda.com';
const FROM = Deno.env.get('REMINDER_FROM') ?? 'Ngaali, Yiga Oluganda <ngaali@yigaoluganda.com>';
const SELF = `${env('SUPABASE_URL')}/functions/v1/reminders`;

/** HMAC of the user id, so unsubscribe links can't be forged for other people. */
async function sign(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('SUPABASE_SERVICE_ROLE_KEY')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`unsubscribe:${userId}`));
  return Array.from(new Uint8Array(mac).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const TEXT = {
  en: {
    subject: (n: string) => `Your drum is waiting, ${n}`,
    body: 'You haven’t practised Luganda today. One short lesson keeps the beat!',
    cta: 'Open Yiga Oluganda',
    why: 'You get this because you turned on daily reminders.',
    off: 'Turn off reminders',
    page: 'Daily reminders are off. You can turn them on again in the app under Me → Settings.',
  },
  sv: {
    subject: (n: string) => `Trumman väntar, ${n}`,
    body: 'Du har inte övat luganda i dag. En kort lektion håller takten!',
    cta: 'Öppna Yiga Oluganda',
    why: 'Du får det här mejlet eftersom du har slagit på dagliga påminnelser.',
    off: 'Stäng av påminnelser',
    page: 'Dagliga påminnelser är avstängda. Du kan slå på dem igen i appen under Jag → Inställningar.',
  },
};

function email(lang: 'en' | 'sv', name: string, unsubscribe: string) {
  const t = TEXT[lang];
  const who = name || (lang === 'sv' ? 'du' : 'friend');
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#250104;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#FFF1EC">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#CDF73D;margin:0 0 12px">Yiga Oluganda</p>
<h1 style="font-size:26px;line-height:1.2;margin:0 0 12px">Gyebale ko, ${esc(who)}!</h1>
<p style="font-size:17px;line-height:1.5;color:#E3BEB7;margin:0 0 24px">${esc(t.body)}</p>
<a href="${APP_URL}" style="display:inline-block;background:#D71A06;color:#FFF1EC;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${esc(t.cta)}</a>
<p style="font-size:13px;color:#A8807A;margin:32px 0 0">${esc(t.why)} <a href="${unsubscribe}" style="color:#E3BEB7">${esc(t.off)}</a></p>
</div></body></html>`;
  const text = `Gyebale ko, ${who}!\n\n${t.body}\n\n${APP_URL}\n\n${t.why} ${t.off}: ${unsubscribe}`;
  return { subject: t.subject(who), html, text };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // One-click unsubscribe.
  const u = url.searchParams.get('u');
  const s = url.searchParams.get('s');
  if (u && s) {
    if (s !== (await sign(u))) return new Response('Invalid link', { status: 400 });
    await admin.from('profiles').update({ reminder_on: false }).eq('id', u);
    const { data } = await admin.from('profiles').select('ui_lang').eq('id', u).maybeSingle();
    const lang = data?.ui_lang === 'sv' ? 'sv' : 'en';
    return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#250104;color:#FFF1EC;font-family:-apple-system,Arial,sans-serif;padding:40px 20px;text-align:center"><p>${TEXT[lang].page}</p>`, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Hourly run from pg_cron.
  if (req.method !== 'POST') return new Response('Not found', { status: 404 });
  const { data: ok } = await admin.rpc('reminders_secret_ok', { secret: req.headers.get('x-cron-secret') ?? '' });
  if (!ok) return new Response('Forbidden', { status: 403 });
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return Response.json({ sent: 0, note: 'RESEND_API_KEY is not set' });

  const { data: due, error } = await admin.rpc('due_reminders');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const sent: string[] = [];
  for (const r of (due ?? []) as { id: string; email: string; name: string; ui_lang: string }[]) {
    const unsubscribe = `${SELF}?u=${r.id}&s=${await sign(r.id)}`;
    const m = email(r.ui_lang === 'sv' ? 'sv' : 'en', r.name, unsubscribe);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [r.email],
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    });
    if (res.ok) sent.push(r.id);
    else console.error('resend', res.status, await res.text());
  }
  if (sent.length) await admin.rpc('mark_reminded', { ids: sent });
  return Response.json({ sent: sent.length, due: due?.length ?? 0 });
});
