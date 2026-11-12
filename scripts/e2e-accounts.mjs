// End-to-end check of accounts and payment in the web build, with Supabase and Stripe replaced
// by an in-browser stand-in (Playwright request interception). Nothing leaves the machine.
// Usage:
//   EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_SUPABASE_URL=https://mock.supabase.test \
//   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
//   npx expo export -p web --output-dir dist-accounts && node scripts/e2e-accounts.mjs [--shots]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    state.calls.push(`${req.method()} ${p}`);

    if (p === '/auth/v1/signup') {
      if (state.users.has(body.email)) return json(route, { code: 'user_already_exists', msg: 'User already registered' }, 422);
      state.users.set(body.email, body.password);
      state.profile = { name: body.data?.name ?? '', ui_lang: body.data?.ui_lang ?? 'en', created_at: new Date().toISOString() };
      return json(route, session(body.email));
    }
    if (p === '/auth/v1/token') {
      if (state.users.get(body.email) !== body.password) return json(route, { code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
      return json(route, session(body.email));
    }
    if (p === '/auth/v1/recover') return json(route, {});
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    if (p === '/auth/v1/user') return json(route, session([...state.users.keys()][0]).user);

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
  await page.getByTestId('settings-account').scrollIntoViewIfNeeded();
  await shot(page, '03-settings');
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
  await browser.close();
}

try {
  await run();
} finally {
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
