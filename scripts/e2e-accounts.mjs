// End-to-end check of accounts and payment in the web build, with Supabase and Stripe replaced
// by an in-browser stand-in (Playwright request interception). Nothing leaves the machine.
// Usage:
//   EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_SUPABASE_URL=https://mock.supabase.test \
//   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
//   EXPO_PUBLIC_GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com \
//   npx expo export -p web --output-dir dist-accounts && node scripts/e2e-accounts.mjs [--shots]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots');
const OUT = path.join(ROOT, 'e2e-shots');
const PORT = 8093;
const BASE = `http://localhost:${PORT}`;
const API = 'https://mock.supabase.test';
mkdirSync(OUT, { recursive: true });
// The service worker (offline copy) is written after the export; add it if this export lacks one.
if (!existsSync(path.join(ROOT, 'dist-accounts', 'sw.js'))) execFileSync('node', [path.join(ROOT, 'scripts/postexport.mjs'), 'dist-accounts'], { stdio: 'ignore' });

const server = spawn('node', [path.join(ROOT, 'scripts/serve.mjs'), path.join(ROOT, 'dist-accounts'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
};
const shot = async (page, name) => SHOTS && page.screenshot({ path: path.join(OUT, `accounts-${name}.png`) });

/** A tiny fake of the Supabase endpoints the app uses, with one user and their subscription. */
function fakeBackend() {
  const state = { users: new Map(), subs: [], progress: null, profile: null, calls: [] };
  const uid = '11111111-1111-4111-8111-111111111111';
  const session = (email) => ({
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'test-refresh-token',
    user: { id: uid, aud: 'authenticated', role: 'authenticated', email, identities: [{ id: uid }], user_metadata: { name: state.profile?.name ?? '' }, app_metadata: {}, created_at: new Date().toISOString() },
  });
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    if (state.offline) return route.abort('internetdisconnected');
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    state.calls.push(`${req.method()} ${p}`);

    if (p === '/auth/v1/signup') {
      if (state.users.has(body.email)) return json(route, { code: 'user_already_exists', msg: 'User already registered' }, 422);
      state.users.set(body.email, body.password);
      state.signedUpWith = body.email;
      state.profile = { name: body.data?.name ?? '', ui_lang: body.data?.ui_lang ?? 'en', created_at: new Date().toISOString() };
      // With e-mail confirmation on, Supabase answers with the user only (no session).
      if (state.confirmRequired) return json(route, session(body.email).user);
      return json(route, session(body.email));
    }
    if (p === '/auth/v1/resend') {
      state.resends = (state.resends ?? 0) + 1;
      return json(route, {});
    }
    if (p === '/auth/v1/verify' && req.method() === 'POST') {
      // The button on /confirm uses the one-time code from the e-mail.
      if (body.token_hash !== 'good-code') return json(route, { code: 'otp_expired', msg: 'Email link is invalid or has expired' }, 403);
      state.verified = body.type;
      return json(route, session([...state.users.keys()][0] ?? 'ada@example.com'));
    }
    if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'id_token') {
      // Like Supabase: the token's nonce must be the SHA-256 of the nonce the page sends.
      const claims = JSON.parse(Buffer.from(body.id_token.split('.')[1], 'base64url').toString());
      if (body.provider !== 'google' || claims.nonce !== createHash('sha256').update(body.nonce ?? '').digest('hex')) {
        return json(route, { code: 'bad_nonce', msg: 'Nonces mismatch' }, 400);
      }
      state.users.set(claims.email, null);
      state.googleSignIns = (state.googleSignIns ?? 0) + 1;
      // What the sign-up trigger makes from Google's data: the first name, English by default.
      state.profile ??= { name: claims.given_name, ui_lang: 'en', created_at: new Date().toISOString() };
      return json(route, session(claims.email));
    }
    if (p === '/auth/v1/token') {
      if (state.users.get(body.email) !== body.password) return json(route, { code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
      return json(route, session(body.email));
    }
    if (p === '/auth/v1/recover') return json(route, {});
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    if (p === '/auth/v1/user') {
      if (req.method() === 'PUT') {
        if (body.password) state.users.set([...state.users.keys()][0], body.password);
        state.passwordChanged = true;
      }
      return json(route, session([...state.users.keys()][0]).user);
    }

    if (p === '/rest/v1/subscriptions') return json(route, state.subs);
    if (p === '/rest/v1/profiles') {
      if (req.method() === 'PATCH') {
        state.profile = { ...state.profile, ...body };
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      }
      return json(route, state.profile ? [state.profile] : []);
    }
    if (p === '/rest/v1/child_profiles') {
      state.children ??= [];
      const id = (url.searchParams.get('id') ?? '').replace(/^eq\./, '');
      if (req.method() === 'POST') {
        const child = { id: `0000000${state.children.length + 1}-0000-4000-8000-000000000000`, name: body.name, data: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        state.children.push(child);
        return json(route, { id: child.id, created_at: child.created_at }, 201);
      }
      if (req.method() === 'PATCH') {
        const child = state.children.find((c) => c.id === id);
        if (child) Object.assign(child, body);
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      }
      if (req.method() === 'DELETE') {
        state.children = state.children.filter((c) => c.id !== id);
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      }
      return json(route, state.children);
    }
    if (p === '/rest/v1/rpc/issue_certificate') {
      state.certCalls = [...(state.certCalls ?? []), body];
      state.cert ??= { code: 'YO-ABCD-EFGH-JK23', issued_at: '2026-11-16T09:00:00Z' };
      return json(route, state.cert.code);
    }
    if (p === '/rest/v1/certificates') return json(route, state.cert ? [{ issued_at: state.cert.issued_at }] : []);
    if (p === '/rest/v1/progress') {
      if (req.method() === 'POST') {
        state.progress = body.data ?? (Array.isArray(body) ? body[0]?.data : null);
        return route.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*' } });
      }
      return json(route, state.progress ? [{ data: state.progress }] : []);
    }

    if (p === '/functions/v1/create-checkout') {
      state.checkouts = (state.checkouts ?? 0) + 1;
      // The first time (straight after sign-up) the learner backs out of Stripe's page.
      if (state.checkouts === 1 && state.backOutFirst) return json(route, { url: `${BASE}/subscribe?status=cancelled` });
      // Pretend Stripe took the payment and the webhook saved the subscription.
      state.subs = [{ id: 'sub_test', status: 'active', current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), cancel_at_period_end: false, created_at: new Date().toISOString(), currency: 'usd' }];
      return json(route, { url: `${BASE}/subscribe?status=success` });
    }
    if (p === '/functions/v1/withdraw') {
      state.subs = state.subs.map((s) => ({ ...s, status: 'canceled' }));
      return json(route, { ok: true, refunded: 449, currency: 'usd' });
    }
    if (p === '/functions/v1/billing-portal') return json(route, { url: `${BASE}/settings` });
    return json(route, { message: `not mocked: ${p}` }, 404);
  }
  return { state, handle };
}

async function run() {
  console.log('\naccounts (mocked Supabase and Stripe)');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'en-US' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const backend = fakeBackend();
  await page.route(`${API}/**`, backend.handle);
  // No Google here (it has its own check below): its script is blocked, so the button stays hidden.
  await page.route('https://accounts.google.com/**', (route) => route.abort());

  // Signed out: the course is locked and the app asks the visitor to log in or create an account.
  await page.goto(BASE);
  await page.getByTestId('screen-sign-in').waitFor({ timeout: 15000 });
  ok(true, 'opening the app signed out shows "Log in"');
  await page.getByTestId('go-sign-up').click();
  await page.getByTestId('screen-sign-up').waitFor();
  ok(true, 'and leads on to "Create your account"');

  // The password is hidden by default, and the learner can choose to show it.
  const pw = page.getByTestId('signup-password');
  await pw.fill('kampala123');
  ok((await pw.getAttribute('type')) === 'password', 'password is hidden by default');
  await page.getByTestId('signup-password-toggle').click();
  ok((await pw.getAttribute('type')) !== 'password', 'the eye button shows the password');
  ok((await page.getByTestId('signup-password-toggle').getAttribute('aria-label')) === 'Hide password', 'the button then offers to hide it');
  await shot(page, '01-sign-up');
  await page.getByTestId('signup-password-toggle').click();
  ok((await pw.getAttribute('type')) === 'password', 'and hides it again');

  // Short passwords are refused before anything is sent.
  await page.getByTestId('signup-name').fill('Sara');
  await page.getByTestId('signup-email').fill('sara@example.com');
  await pw.fill('short');
  await page.getByTestId('signup-submit').click();
  ok((await page.getByTestId('google-button').count()) === 0, 'without Google\'s script the e-mail form stands alone');
  ok(await page.getByTestId('form-error').isVisible(), 'a short password gets a clear message');
  ok(!backend.state.calls.includes('POST /auth/v1/signup'), 'and is not sent');

  await pw.fill('kampala123');
  backend.state.backOutFirst = true;
  await page.getByTestId('signup-submit').click();
  await page.waitForURL(/status=cancelled/, { timeout: 15000 });
  ok(backend.state.checkouts === 1, 'after sign-up the app goes straight to the payment page');
  await page.getByTestId('screen-subscribe').waitFor({ timeout: 10000 });
  ok(true, 'backing out of the payment page shows the plan (no free trial)');
  ok(/\$4\.49 \/ month/.test(await page.getByTestId('sub-price').innerText()), 'the plan shows the local price (US: $4.49 / month)');
  ok((await page.getByText('cheaper than through an app store').count()) > 0, 'it says paying on the website is cheaper');
  ok((await page.locator('[data-testid="tab-home"]').count()) === 0, 'the course stays locked before paying');
  await page.goto(`${BASE}/lesson/c01-l1`);
  await page.getByTestId('screen-subscribe').waitFor();
  ok(true, 'opening a lesson directly still shows the plan');
  await shot(page, '02-subscribe');

  // Pay: Stripe (mocked) sends the learner back and the course unlocks.
  await page.getByTestId('sub-pay').click();
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  ok(true, 'after paying, the course unlocks');
  ok((await page.getByTestId('home-greeting').innerText()).includes('Sara'), 'home greets the learner by the name from sign-up');
  await page.waitForTimeout(2000);
  ok(backend.state.progress?.profile?.name === 'Sara', 'progress is saved to the account');

  // Settings: subscription, the 14-day withdrawal button, log out.
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-account').waitFor();
  ok((await page.getByTestId('sub-state').innerText()).startsWith('Active · renews on'), 'settings show the active subscription');
  ok((await page.getByTestId('account-email').innerText()) === 'sara@example.com', 'settings show the account e-mail');
  // Daily reminder by e-mail: switching it on saves it to the account.
  await page.getByTestId('reminder-switch').click();
  await page.getByTestId('reminder-hour-21').click();
  await page.waitForTimeout(2500);
  ok(backend.state.profile?.reminder_on === true && backend.state.profile?.reminder_hour === 21, 'the daily reminder (e-mail at 21:00) is saved to the account');
  ok(typeof backend.state.profile?.timezone === 'string' && backend.state.profile.timezone.length > 0, 'the time zone is saved for the reminder');
  await page.getByTestId('settings-account').scrollIntoViewIfNeeded();
  await shot(page, '03-settings');

  // Offline: the web app keeps a copy of itself, and remembers the subscription, so a paying
  // learner can open it and keep learning without a connection.
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 15000 });
  ok(true, 'the service worker keeps an offline copy of the app');
  backend.state.offline = true;
  await page.context().setOffline(true);
  await page.goto(BASE);
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  ok(true, 'offline, the app still opens the course for a paying learner');
  await page.context().setOffline(false);
  backend.state.offline = false;

  // Kids mode with an account: the child's profile and progress are kept in the account.
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-learners').click();
  await page.getByTestId('learner-add').click();
  await page.getByTestId('learner-name').fill('Kato');
  await page.getByTestId('learner-save').click();
  await page.getByTestId('learner-Kato').waitFor({ timeout: 10000 });
  ok(backend.state.children?.[0]?.name === 'Kato', 'a child\'s profile is created in the account');
  await page.getByTestId('learner-Kato').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('home-greeting').innerText()).includes('Kato'), 'and the app switches to the child');
  // The child does something (opens their first chapter): that is saved to the child's profile.
  await page.getByTestId('tile-c03').click();
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('back').click();
  await page.getByTestId('screen-home').waitFor();
  await page.waitForTimeout(2500);
  ok(backend.state.children[0].data?.profile?.name === 'Kato' && backend.state.children[0].data?.opened?.c03 === true, 'the child\'s progress is saved to their profile in the account');
  ok(backend.state.progress?.profile?.name === 'Sara', 'and the parent\'s progress stays in the parent\'s place');
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-learners').click();
  await page.getByTestId('learner-main').click();
  await page.getByTestId('parent-gate').waitFor();
  const q = (await page.getByTestId('gate-question').innerText()).toLowerCase();
  const n = { four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const [x, y] = q.match(/[a-z]+/g).map((w) => n[w]).filter(Boolean);
  await page.getByTestId('gate-answer').fill(String(x * y));
  await page.getByTestId('gate-submit').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('home-greeting').innerText()).includes('Sara'), 'a grown-up switches back to the parent');

  // Certificates: once Part 1 is finished, the account's server issues one with a code.
  const part1 = JSON.parse(readFileSync(path.join(ROOT, 'content/unit-1/chapters.json'), 'utf8')).flatMap((c) => c.lessons.map((l) => l.id));
  const finished = Object.fromEntries(part1.map((id) => [id, { completedAt: Date.now(), bestAccuracy: 1, plays: 1 }]));
  backend.state.progress = { ...backend.state.progress, done: { ...backend.state.progress?.done, ...finished } };
  await page.evaluate((done) => {
    const raw = JSON.parse(localStorage.getItem('yiga-oluganda-v2'));
    raw.state.done = { ...raw.state.done, ...done };
    localStorage.setItem('yiga-oluganda-v2', JSON.stringify(raw));
  }, finished);
  await page.reload();
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('cert-open-1').click();
  await page.getByTestId('cert-name').waitFor();
  ok((await page.getByTestId('cert-name').inputValue()) === 'Sara', 'the certificate page starts with the learner\'s name');
  await page.getByTestId('cert-name').fill('Sara Nalwoga');
  await page.getByTestId('cert-issue').click();
  await page.getByTestId('cert-pdf').waitFor({ timeout: 10000 });
  ok((await page.getByTestId('cert-code').innerText()) === 'YO-ABCD-EFGH-JK23', 'the server issues the certificate with its code');
  const call = backend.state.certCalls?.[0] ?? {};
  ok(call.p_learner === 'main' && call.p_part === 1 && call.p_name === 'Sara Nalwoga' && call.p_lang === 'en', 'it is issued to the account holder, for Part 1, with the name given');
  await shot(page, '05-certificate');
  await page.getByTestId('cert-pdf').click();
  await page.waitForTimeout(800);
  const printed = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.contentDocument?.body?.innerText ?? '').join(' '));
  ok(printed.includes('Sara Nalwoga') && printed.includes('YO-ABCD-EFGH-JK23') && printed.includes('yigaoluganda.com/verify/?c=YO-ABCD-EFGH-JK23'), '"Save as PDF" prints the certificate page with the name, code and check link');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.getByTestId('cert-share').click();
  await page.getByTestId('form-ok').waitFor({ timeout: 5000 }).catch(() => undefined);
  ok((await page.evaluate(() => navigator.clipboard.readText())) === 'https://yigaoluganda.com/verify/?c=YO-ABCD-EFGH-JK23', 'without a share sheet, "Share the link" copies the check link');
  await page.waitForTimeout(2500);
  ok(backend.state.progress?.certs?.['1']?.code === 'YO-ABCD-EFGH-JK23', 'the certificate is kept with the learner\'s progress in the account');
  await page.getByTestId('back').click();
  await page.getByTestId('certificates-card').waitFor();
  ok((await page.getByTestId('cert-open-1').getAttribute('aria-label')).includes('YO-ABCD-EFGH-JK23'), 'the Me tab lists the certificate by its code');
  await page.getByTestId('tab-home').click();

  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-account').waitFor();
  await page.getByTestId('sub-withdraw').click();
  await page.getByTestId('account-confirm').click();
  await page.getByTestId('screen-subscribe').waitFor({ timeout: 10000 });
  ok(true, 'withdrawing within 14 days ends access');

  // Log out, then log in again with a wrong and then the right password.
  await page.getByTestId('sub-logout').click();
  await page.getByTestId('screen-sign-in').waitFor({ timeout: 10000 });
  await page.getByTestId('signin-email').fill('sara@example.com');
  await page.getByTestId('signin-password').fill('wrongpass1');
  await page.getByTestId('signin-submit').click();
  await page.getByTestId('form-error').waitFor();
  ok((await page.getByTestId('form-error').innerText()).includes('Wrong e-mail or password'), 'a wrong password says so');
  await page.getByTestId('signin-password-toggle').click();
  ok((await page.getByTestId('signin-password').getAttribute('type')) !== 'password', 'the log-in password can be shown too');
  await shot(page, '04-sign-in');
  await page.getByTestId('signin-password').fill('kampala123');
  await page.getByTestId('signin-submit').click();
  await page.getByTestId('screen-subscribe').waitFor({ timeout: 10000 });
  ok(true, 'logging in without a subscription shows the plan');

  // Forgot password, and the Swedish sign-up page linked from the landing page.
  await page.getByTestId('sub-logout').click();
  await page.getByTestId('screen-sign-in').waitFor();
  await page.getByTestId('go-forgot').click();
  await page.getByTestId('forgot-email').fill('sara@example.com');
  await page.getByTestId('forgot-submit').click();
  await page.getByTestId('form-ok').waitFor();
  ok(backend.state.calls.includes('POST /auth/v1/recover'), 'forgot password sends a reset link');
  await page.goto(`${BASE}/sign-up?lang=sv`);
  await page.getByText('Skapa ditt konto').first().waitFor();
  ok(true, '?lang=sv opens sign-up in Swedish');
  ok((await page.getByTestId('signup-password-toggle').getAttribute('aria-label')) === 'Visa lösenordet', 'the eye button is labelled in Swedish');

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);

  // The link in the password-reset e-mail. Supabase sends the browser back with the login in the
  // address (#access_token=…&type=recovery). This fake answers at once, which used to lose the race
  // and drop the learner on the main page instead of "Choose a new password".
  const reset = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const resetBackend = fakeBackend();
  resetBackend.state.users.set('ada@example.com', 'old-password-1');
  resetBackend.state.profile = { name: 'Ada', ui_lang: 'en', created_at: new Date().toISOString() };
  await reset.route(`${API}/**`, resetBackend.handle);
  const now = Math.floor(Date.now() / 1000);
  await reset.goto(`${BASE}/reset-password#access_token=test-access-token&expires_at=${now + 3600}&expires_in=3600&refresh_token=test-refresh-token&token_type=bearer&type=recovery`);
  await reset.getByTestId('screen-reset').waitFor({ timeout: 15000 });
  ok(true, 'the reset link opens "Choose a new password" (backend answering instantly)');
  await reset.waitForTimeout(800);
  ok(!reset.url().includes('access_token'), 'the login from the link is removed from the address bar');
  await reset.reload();
  await reset.getByTestId('screen-reset').waitFor({ timeout: 15000 });
  ok(true, 'and it is still there after reloading the page');
  await reset.getByTestId('reset-password').fill('new-password-2');
  await reset.getByTestId('reset-submit').click();
  await reset.getByTestId('screen-reset').waitFor({ state: 'detached', timeout: 15000 });
  ok(resetBackend.state.passwordChanged === true, 'saving the new password updates it and leaves the reset screen');
  await reset.close();

  // Sign-up with e-mail confirmation on (as on the live site).
  const conf = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const confBackend = fakeBackend();
  confBackend.state.confirmRequired = true;
  await conf.route(`${API}/**`, confBackend.handle);
  await conf.goto(`${BASE}/sign-up`);
  await conf.getByTestId('screen-sign-up').waitFor({ timeout: 15000 });
  await conf.getByTestId('signup-name').fill('Ada');
  await conf.getByTestId('signup-email').fill('ada@gmail.clm');
  await conf.getByTestId('signup-password').fill('a-good-password');
  await conf.getByTestId('signup-submit').click();
  await conf.getByTestId('email-suggestion').waitFor({ timeout: 5000 });
  ok((await conf.getByTestId('email-suggestion').innerText()).includes('ada@gmail.com'), 'a typo like gmail.clm is caught: "Did you mean ada@gmail.com?"');
  ok(!confBackend.state.signedUpWith, 'and nothing is sent until the learner answers');
  await conf.getByTestId('email-suggestion-use').click();
  await conf.getByTestId('screen-check-email').waitFor({ timeout: 10000 });
  ok(confBackend.state.signedUpWith === 'ada@gmail.com', 'the corrected address is used');
  const checkText = await conf.getByTestId('screen-check-email').innerText();
  ok(checkText.includes('newest') && checkText.includes('Spam'), '"Check your inbox" says to open the newest e-mail and look in Spam');
  ok((await conf.getByTestId('resend').innerText()).includes('Send again in'), '"Send again" waits a minute, so earlier links aren\'t cancelled by accident');
  await conf.getByTestId('change-email').click();
  await conf.getByTestId('screen-sign-up').waitFor();
  ok(true, 'a wrong address can be changed');
  await conf.close();

  // The e-mail's link opens /confirm; the code is only used when the person taps the button.
  const link = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const linkBackend = fakeBackend();
  linkBackend.state.users.set('ada@example.com', 'a-good-password');
  linkBackend.state.profile = { name: 'Ada', ui_lang: 'en', created_at: new Date().toISOString() };
  await link.route(`${API}/**`, linkBackend.handle);
  await link.goto(`${BASE}/confirm?token_hash=good-code&type=email&lang=en`);
  await link.getByTestId('screen-confirm').waitFor({ timeout: 15000 });
  ok(!linkBackend.state.verified, 'opening the link alone uses nothing up (mail scanners can\'t spoil it)');
  await link.getByTestId('confirm-submit').click();
  await link.getByTestId('screen-subscribe').waitFor({ timeout: 15000 });
  ok(linkBackend.state.verified === 'email', 'tapping "Confirm my account" logs in and leads to the plan');
  await link.close();

  const old = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  await old.route(`${API}/**`, fakeBackend().handle);
  await old.goto(`${BASE}/confirm?token_hash=old-code&type=email`);
  await old.getByTestId('confirm-submit').click();
  await old.getByTestId('form-error').waitFor({ timeout: 10000 });
  ok((await old.getByTestId('form-error').innerText()).includes('expired'), 'an old link says it has expired and offers to log in');
  await old.close();

  const resetLink = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const rlBackend = fakeBackend();
  rlBackend.state.users.set('ada@example.com', 'a-good-password');
  rlBackend.state.profile = { name: 'Ada', ui_lang: 'en', created_at: new Date().toISOString() };
  await resetLink.route(`${API}/**`, rlBackend.handle);
  await resetLink.goto(`${BASE}/confirm?token_hash=good-code&type=recovery&lang=en`);
  await resetLink.getByTestId('confirm-submit').click();
  await resetLink.getByTestId('screen-reset').waitFor({ timeout: 15000 });
  ok(rlBackend.state.verified === 'recovery', 'the new password e-mail leads to "Choose a new password"');
  await resetLink.close();

  // "Continue with Google" (Google's script replaced by a stand-in that hands back a signed-in token).
  const goog = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'sv-SE' });
  const gBackend = fakeBackend();
  await goog.route(`${API}/**`, gBackend.handle);
  await goog.route('https://accounts.google.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.google = { accounts: { id: {
        initialize(o) { window.__gis = o; },
        renderButton(el, opts) {
          window.__gisOptions = opts;
          const b = document.createElement('button');
          b.textContent = 'Fortsätt med Google';
          b.setAttribute('data-testid', 'gis-button');
          const enc = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\\+/g, '-').replace(/\\//g, '_');
          b.onclick = () => window.__gis.callback({ credential: enc({ alg: 'RS256' }) + '.' + enc({ email: 'ada@gmail.com', given_name: 'Ada', name: 'Ada Nakato', nonce: window.__gis.nonce }) + '.sig' });
          el.appendChild(b);
        },
      } } };`,
    }),
  );
  await goog.goto(`${BASE}/sign-up?lang=sv`);
  await goog.getByTestId('gis-button').waitFor({ timeout: 15000 });
  ok(true, 'sign-up shows "Continue with Google"');
  ok((await goog.evaluate(() => window.__gisOptions?.locale)) === 'sv', 'Google\'s button follows the app language');
  await goog.getByTestId('gis-button').click();
  await goog.getByTestId('screen-home').waitFor({ timeout: 20000 });
  ok(gBackend.state.googleSignIns === 1, 'Google sign-in logs in through Supabase (nonce checked)');
  ok(gBackend.state.checkouts === 1, 'a new Google account goes straight to the payment page');
  ok((await goog.getByTestId('home-greeting').innerText()).includes('Ada'), 'and is greeted by first name');
  await goog.waitForTimeout(2500);
  ok(gBackend.state.profile?.ui_lang === 'sv', 'the account keeps the language chosen on the page (Swedish)');
  await goog.close();

  // An expired or already-used link (mail apps sometimes open links to scan them) explains itself.
  const expired = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  await expired.route(`${API}/**`, fakeBackend().handle);
  await expired.goto(`${BASE}/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
  await expired.getByTestId('form-error').waitFor({ timeout: 15000 });
  ok((await expired.getByTestId('form-error').innerText()).includes('expired'), 'an expired link says so and offers a new one');
  await expired.close();

  await browser.close();
}

try {
  await run();
} finally {
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
