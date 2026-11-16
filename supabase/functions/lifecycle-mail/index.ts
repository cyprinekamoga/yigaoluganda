// Welcome e-mails (day 1, 3 and 7 after signing up) and one "come back" e-mail a few days after a
// subscription ends, sent through Resend.
//   POST from pg_cron with the x-cron-secret header → sends what is due (public.due_lifecycle).
//   GET or POST with ?u=<user id>&s=<signature> → one-click "no more tips" (link in every e-mail).
// Each kind goes to a person at most once (public.mail_log). Needs RESEND_API_KEY; without it
// nothing is sent. Deployed without Supabase login: the cron secret or the signature is checked.
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.yigaoluganda.com';
const FROM = Deno.env.get('LIFECYCLE_FROM') ?? 'Ngaali, Yiga Oluganda <ngaali@yigaoluganda.com>';
const SELF = `${env('SUPABASE_URL')}/functions/v1/lifecycle-mail`;

type Kind = 'welcome_1' | 'welcome_3' | 'welcome_7' | 'come_back';
type Lang = 'en' | 'sv';

/** HMAC of the user id, so opt-out links can't be forged for other people. */
async function sign(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('SUPABASE_SERVICE_ROLE_KEY')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`tips:${userId}`));
  return Array.from(new Uint8Array(mac).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface Mail {
  subject: string;
  title: string;
  paragraphs: string[];
  cta: string;
  path: string;
}

const MAILS: Record<Lang, Record<Kind, (name: string, phrases: number) => Mail>> = {
  en: {
    welcome_1: (n) => ({
      subject: `Your first steps in Luganda, ${n}`,
      title: `Gyebale ko, ${n}!`,
      paragraphs: [
        'Welcome to Yiga Oluganda. Three things that help in the first week:',
        '• Pick a daily goal on the home screen. One lesson a day is enough to keep going.',
        '• Say the phrases out loud. Luganda sounds change meaning when they are long or short, and your mouth learns them faster than your eyes.',
        '• Use what you learn the same day: greet someone with “Oli otya?”',
      ],
      cta: 'Do today’s lesson',
      path: '/',
    }),
    welcome_3: (n) => ({
      subject: 'Have you found these yet?',
      title: `Ki kati, ${n}?`,
      paragraphs: [
        'Three days in. A few things in the Practice Lab you may not have tried:',
        '• Reading stories: short stories in Luganda made from what you have learned.',
        '• Speak & compare: record yourself next to a native speaker, and send it to a Luganda speaker for a tip.',
        '• The review round fills your water pots and brings back the phrases you are about to forget.',
      ],
      cta: 'Open the Practice Lab',
      path: '/practice',
    }),
    welcome_7: (n, phrases) => ({
      subject: `One week of Luganda, ${n}`,
      title: 'Weebale nnyo!',
      paragraphs: [
        phrases > 0 ? `You have learned ${phrases} phrases in your first week. That is real Luganda you can use.` : 'A week ago you started learning Luganda. It is never too late to do the first lesson.',
        'Finish all the chapters of a part and you get a certificate with your name on it, which anyone can check on yigaoluganda.com.',
      ],
      cta: 'Keep going',
      path: '/',
    }),
    come_back: (n, phrases) => ({
      subject: `We miss you, ${n}`,
      title: `Gyebale ko, ${n}`,
      paragraphs: [
        'Your subscription has ended. Your progress is still saved in your account' + (phrases > 0 ? `, including the ${phrases} phrases you learned.` : '.'),
        'Whenever you want to continue, you start right where you stopped.',
      ],
      cta: 'Come back to Yiga Oluganda',
      path: '/subscribe',
    }),
  },
  sv: {
    welcome_1: (n) => ({
      subject: `Dina första steg i luganda, ${n}`,
      title: `Gyebale ko, ${n}!`,
      paragraphs: [
        'Välkommen till Yiga Oluganda. Tre saker som hjälper den första veckan:',
        '• Välj ett dagligt mål på startsidan. En lektion om dagen räcker för att komma igång.',
        '• Säg fraserna högt. I luganda ändras betydelsen när ljud är långa eller korta, och munnen lär sig snabbare än ögonen.',
        '• Använd det du lär dig samma dag: hälsa på någon med ”Oli otya?”',
      ],
      cta: 'Gör dagens lektion',
      path: '/',
    }),
    welcome_3: (n) => ({
      subject: 'Har du hittat de här än?',
      title: `Ki kati, ${n}?`,
      paragraphs: [
        'Tre dagar in. Några saker i övningslabbet som du kanske inte har provat:',
        '• Läsberättelser: korta berättelser på luganda gjorda av det du har lärt dig.',
        '• Prata och jämför: spela in dig själv bredvid en modersmålstalare och skicka inspelningen för ett tips.',
        '• Repetitionsrundan fyller vattenkrukorna och tar fram fraserna du håller på att glömma.',
      ],
      cta: 'Öppna övningslabbet',
      path: '/practice',
    }),
    welcome_7: (n, phrases) => ({
      subject: `En vecka med luganda, ${n}`,
      title: 'Weebale nnyo!',
      paragraphs: [
        phrases > 0 ? `Du har lärt dig ${phrases} fraser första veckan. Det är riktig luganda som du kan använda.` : 'För en vecka sedan började du lära dig luganda. Det är aldrig för sent att göra första lektionen.',
        'Gör klart alla kapitel i en del så får du ett diplom med ditt namn, som vem som helst kan kontrollera på yigaoluganda.com.',
      ],
      cta: 'Fortsätt',
      path: '/',
    }),
    come_back: (n, phrases) => ({
      subject: `Vi saknar dig, ${n}`,
      title: `Gyebale ko, ${n}`,
      paragraphs: [
        'Ditt abonnemang har tagit slut. Dina framsteg finns kvar i ditt konto' + (phrases > 0 ? `, med de ${phrases} fraser du har lärt dig.` : '.'),
        'När du vill fortsätta börjar du precis där du slutade.',
      ],
      cta: 'Kom tillbaka till Yiga Oluganda',
      path: '/subscribe',
    }),
  },
};

const FOOT: Record<Lang, { why: string; off: string; page: string }> = {
  en: {
    why: 'You get tips like this because you have a Yiga Oluganda account.',
    off: 'No more tips by e-mail',
    page: 'You won’t get tips by e-mail any more. You can turn them on again in the app under Me → Settings.',
  },
  sv: {
    why: 'Du får tips som det här eftersom du har ett konto hos Yiga Oluganda.',
    off: 'Inga fler tips via mejl',
    page: 'Du får inga fler tips via mejl. Du kan slå på dem igen i appen under Jag → Inställningar.',
  },
};

export function render(lang: Lang, kind: Kind, name: string, phrases: number, optOut: string) {
  const who = name || (lang === 'sv' ? 'du' : 'friend');
  const m = MAILS[lang][kind](who, phrases);
  const f = FOOT[lang];
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#250104;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#FFF1EC">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#CDF73D;margin:0 0 12px">Yiga Oluganda</p>
<h1 style="font-size:26px;line-height:1.2;margin:0 0 12px">${esc(m.title)}</h1>
${m.paragraphs.map((p) => `<p style="font-size:17px;line-height:1.5;color:#E3BEB7;margin:0 0 12px">${esc(p)}</p>`).join('\n')}
<p style="margin:20px 0 0"><a href="${APP_URL}${m.path}" style="display:inline-block;background:#D71A06;color:#FFF1EC;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${esc(m.cta)}</a></p>
<p style="font-size:13px;color:#A8807A;margin:32px 0 0">${esc(f.why)} <a href="${optOut}" style="color:#E3BEB7">${esc(f.off)}</a></p>
</div></body></html>`;
  const text = `${m.title}\n\n${m.paragraphs.join('\n\n')}\n\n${m.cta}: ${APP_URL}${m.path}\n\n${f.why} ${f.off}: ${optOut}`;
  return { subject: m.subject, html, text };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // One-click opt-out.
  const u = url.searchParams.get('u');
  const s = url.searchParams.get('s');
  if (u && s) {
    if (s !== (await sign(u))) return new Response('Invalid link', { status: 400 });
    await admin.from('profiles').update({ tips_email: false }).eq('id', u);
    const { data } = await admin.from('profiles').select('ui_lang').eq('id', u).maybeSingle();
    const lang: Lang = data?.ui_lang === 'sv' ? 'sv' : 'en';
    return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#250104;color:#FFF1EC;font-family:-apple-system,Arial,sans-serif;padding:40px 20px;text-align:center"><p>${FOOT[lang].page}</p>`, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Hourly run from pg_cron.
  if (req.method !== 'POST') return new Response('Not found', { status: 404 });
  const { data: ok } = await admin.rpc('reminders_secret_ok', { secret: req.headers.get('x-cron-secret') ?? '' });
  if (!ok) return new Response('Forbidden', { status: 403 });
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return Response.json({ sent: 0, note: 'RESEND_API_KEY is not set' });

  const { data: due, error } = await admin.rpc('due_lifecycle');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let sent = 0;
  const handled = new Set<string>();
  for (const r of (due ?? []) as { id: string; email: string; name: string; ui_lang: string; kind: Kind; phrases: number }[]) {
    // At most one of these e-mails per person per run (and the lookup allows one a day).
    if (handled.has(r.id)) continue;
    handled.add(r.id);
    // Log first, so a slow or repeated run can never send the same e-mail twice.
    const { error: logError } = await admin.from('mail_log').insert({ user_id: r.id, kind: r.kind });
    if (logError) continue;
    const optOut = `${SELF}?u=${r.id}&s=${await sign(r.id)}`;
    const m = render(r.ui_lang === 'sv' ? 'sv' : 'en', r.kind, r.name, r.phrases ?? 0, optOut);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [r.email],
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: { 'List-Unsubscribe': `<${optOut}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    });
    if (res.ok) sent++;
    else {
      console.error('resend', res.status, await res.text());
      // Not sent: allow another try next hour.
      await admin.from('mail_log').delete().eq('user_id', r.id).eq('kind', r.kind);
    }
  }
  return Response.json({ sent, due: due?.length ?? 0 });
});
