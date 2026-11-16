// POST /school-request { name, school, email, students, message, lang, captcha } from the website's
// "For schools" form. Limits requests per visitor (a hashed IP address: 3 an hour, 10 a day), checks
// the Cloudflare Turnstile bot test when TURNSTILE_SECRET is set, then saves the request (which
// e-mails the support address). Deployed without Supabase login: the form is public.
import { admin } from '../_shared/clients.ts';
import { env } from '../_shared/http.ts';

const ORIGINS = ['https://yigaoluganda.com', 'https://www.yigaoluganda.com'];
const headersFor = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function captchaOk(token: unknown, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) return true; // not set up yet
  if (typeof token !== 'string' || !token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean };
  return data.success === true;
}

Deno.serve(async (req) => {
  const cors = headersFor(req.headers.get('origin'));
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'not_found' }, 404);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  // The address itself is never stored, only a salted hash of it.
  const key = `school:${(await sha256(`${ip}:${env('SUPABASE_SERVICE_ROLE_KEY')}`)).slice(0, 32)}`;
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: hour }, { count: day }] = await Promise.all([
    admin.from('request_limits').select('key', { count: 'exact', head: true }).eq('key', key).gt('created_at', hourAgo),
    admin.from('request_limits').select('key', { count: 'exact', head: true }).eq('key', key).gt('created_at', dayAgo),
  ]);
  if ((hour ?? 0) >= 3 || (day ?? 0) >= 10) return reply({ error: 'too_many' }, 429);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!(await captchaOk(b.captcha, ip))) return reply({ error: 'captcha' }, 400);
  const text = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '');
  const name = text('name', 100);
  const school = text('school', 150);
  const email = text('email', 200);
  if (!name || !school || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply({ error: 'invalid' }, 400);
  const n = Number(b.students);
  const students = Number.isInteger(n) && n > 0 && n <= 2000 ? n : null;

  await admin.from('request_limits').insert({ key });
  // Entries older than two days are no longer needed.
  await admin.from('request_limits').delete().lt('created_at', new Date(Date.now() - 2 * 86_400_000).toISOString());
  const { error } = await admin.rpc('request_school_licence', {
    p_name: name,
    p_school: school,
    p_email: email,
    p_students: students,
    p_message: text('message', 2000),
    p_lang: b.lang === 'sv' ? 'sv' : 'en',
  });
  if (error) return reply({ error: 'failed' }, 500);
  return reply({ ok: true });
});
