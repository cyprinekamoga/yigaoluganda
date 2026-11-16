// End-to-end check of accounts and payment in the web build, with Supabase and Stripe replaced
// by an in-browser stand-in (Playwright request interception). Nothing leaves the machine.
// Usage:
//   EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_SUPABASE_URL=https://mock.supabase.test \
//   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
//   npx expo export -p web --output-dir dist-accounts && node scripts/e2e-accounts.mjs [--shots]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
    if (p === '/rest/v1/progress') {
      if (req.method() === 'POST') {
        state.progress = body.data ?? (Array.isArray(body) ? body[0]?.data : null);
        return route.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*' } });
      }
      return json(route, state.progress ? [{ data: state.progress }] : []);
    }

    if (p === '/functions/v1/create-checkout') {
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
  ok(await page.getByTestId('form-error').isVisible(), 'a short password gets a clear message');
  ok(!backend.state.calls.includes('POST /auth/v1/signup'), 'and is not sent');

  await pw.fill('kampala123');
  await page.getByTestId('signup-submit').click();
  await page.getByTestId('screen-subscribe').waitFor({ timeout: 10000 });
  ok(true, 'after sign-up the app asks for the plan (no free trial)');
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
