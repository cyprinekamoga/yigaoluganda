// End-to-end check of accounts and payment in the web build, with Supabase and Stripe replaced
// by an in-browser stand-in (Playwright request interception). Nothing leaves the machine.
// Usage:
//   EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_SUPABASE_URL=https://mock.supabase.test \
//   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
//   EXPO_PUBLIC_GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com \
//   npx expo export -p web --output-dir dist-accounts && node scripts/e2e-accounts.mjs [--shots]
import { createRequire } from 'node:module';
import { cspFromNetlify, enforceCsp } from './csp.mjs';
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
    user: { id: uid, aud: 'authenticated', role: 'authenticated', email, identities: [{ id: uid, provider: 'email' }], user_metadata: { name: state.profile?.name ?? '' }, app_metadata: {}, created_at: new Date().toISOString() },
  });
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    if (state.offline) return route.abort('internetdisconnected');
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    let body = {};
    if (!p.startsWith('/storage/')) body = req.postData() ? JSON.parse(req.postData()) : {};
    state.calls.push(`${req.method()} ${p}`);
    const none = () => route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });

    // Native-speaker feedback, reports and reviewing.
    if (p.startsWith('/storage/v1/object/recordings/')) {
      state.uploads = [...(state.uploads ?? []), { path: decodeURIComponent(p.slice('/storage/v1/object/recordings/'.length)), type: req.headers()['content-type'] ?? '', size: req.postDataBuffer()?.length ?? 0 }];
      return json(route, { Key: p.slice('/storage/v1/object/'.length), Id: 'obj-1' });
    }
    if (p.startsWith('/storage/v1/object/sign/')) {
      if (req.method() === 'POST') return json(route, { signedURL: '/object/sign/recordings/x.webm?token=t' });
      return route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' } });
    }
    if (p === '/rest/v1/rpc/request_feedback') {
      state.feedbackCalls = [...(state.feedbackCalls ?? []), body];
      return json(route, '11111111-1111-4111-8111-111111111111');
    }
    if (p === '/rest/v1/feedback_requests') return json(route, url.searchParams.get('status') === 'eq.open' ? (state.openRequests ?? []) : (state.feedback ?? []));
    if (p === '/rest/v1/rpc/mark_feedback_seen') {
      state.seen = true;
      return none();
    }
    if (p === '/rest/v1/rpc/answer_feedback') {
      state.answered = body;
      return none();
    }
    if (p === '/rest/v1/reports') {
      if (req.method() === 'POST') {
        state.reports = [...(state.reports ?? []), Array.isArray(body) ? body[0] : body];
        return route.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*' } });
      }
      return json(route, state.openReports ?? []);
    }
    if (p === '/rest/v1/rpc/resolve_report') {
      state.resolved = body;
      return none();
    }
    if (p === '/rest/v1/reviewers') return json(route, state.role ? [{ role: state.role }] : []);
    if (p === '/rest/v1/rpc/owner_stats') {
      return json(route, {
        accounts: 12, new_today: 1, new_7d: 4, new_30d: 9, paying: 3, paying_by_currency: { USD: 2, SEK: 1 }, past_due: 0, ending: 1, new_subs_30d: 3, cancelled_30d: 1, active_7d: 5,
        reminders_on: 2, children: 0, certificates: 1, open_feedback: 1, answered_feedback: 2, open_reports: 1,
        paying_by_plan: [{ plan: 'monthly', currency: 'USD', n: 2 }, { plan: 'family_yearly', currency: 'SEK', n: 1 }], family_members: 2,
        signups_by_day: Array.from({ length: 14 }, (_, i) => ({ day: `2026-11-${String(i + 3).padStart(2, '0')}`, n: i % 3 })),
        top_reported: [{ item_type: 'phrase', item_id: 'oli-otya', n: 2, open: 1 }],
      });
    }
    if (p === '/rest/v1/rpc/list_reviewers') return json(route, state.reviewerList ?? [{ email: 'sara@example.com', role: 'owner', added_at: new Date().toISOString() }]);
    if (p === '/rest/v1/rpc/set_reviewer') {
      state.setReviewer = body;
      if (body.p_email.includes('nobody')) return json(route, 'no_account');
      state.reviewerList = [{ email: 'sara@example.com', role: 'owner', added_at: new Date().toISOString() }, { email: body.p_email, role: 'reviewer', added_at: new Date().toISOString() }];
      return json(route, body.p_on ? 'added' : 'removed');
    }

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
        if (body.password) {
          state.users.set([...state.users.keys()][0], body.password);
          state.passwordChanged = true;
        }
        if (body.email) state.emailChange = body.email;
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

    // Family plans. The payer's family exists once they pay for a Family plan; FAMX2345 is the
    // invite code of another payer's family (named Sara) that this fake knows about.
    if (p === '/rest/v1/rpc/my_family') {
      const paysFamily = state.subs.some((s) => ['active', 'trialing', 'past_due'].includes(s.status) && String(s.plan).startsWith('family'));
      if (paysFamily) {
        const members = state.familyMembers ?? [];
        return json(route, { role: 'owner', active: true, code: 'OWNR2345', seats: 6, used: 1 + members.length + (state.children?.length ?? 0), members });
      }
      if (state.familyMember) return json(route, { role: 'member', active: true, owner_name: 'Sara' });
      return json(route, { role: null });
    }
    if (p === '/rest/v1/rpc/join_family') {
      state.joinedFamily = body.p_code;
      if (body.p_code !== 'FAMX2345') return json(route, { error: 'no_family' });
      state.familyMember = true;
      return json(route, { ok: true });
    }
    if (p === '/rest/v1/rpc/leave_family') {
      state.familyMember = false;
      return none();
    }
    if (p === '/rest/v1/rpc/remove_family_member') {
      state.familyMembers = (state.familyMembers ?? []).filter((m) => m.user_id !== body.p_user);
      return none();
    }

    // Schools: class licences.
    if (p === '/rest/v1/rpc/my_licence') return json(route, state.licences ?? []);
    if (p === '/rest/v1/rpc/join_class') {
      state.joined = body.p_code;
      if (body.p_code !== 'ABCD2345') return json(route, { error: 'no_class' });
      state.licences = [{ class_id: 'cl1', name: 'Luganda 4B', school: 'Uppsala kommun', licence_until: '2099-06-30', teacher: false }];
      return json(route, { ok: true, name: 'Luganda 4B', licence_until: '2099-06-30' });
    }
    if (p === '/rest/v1/classes') return json(route, state.teacherClasses ?? []);
    if (p === '/rest/v1/rpc/class_progress') return json(route, [{ name: 'Kato', joined_at: new Date().toISOString(), last_active_day: '2026-11-15', lessons: 6, phrases: 21 }, { name: 'Nakato', joined_at: new Date().toISOString(), last_active_day: null, lessons: 0, phrases: 0 }]);
    if (p === '/rest/v1/rpc/owner_school_requests') return json(route, [{ id: 'sr1', name: 'Ada', school: 'Uppsala kommun', email: 'ada@example.se', students: 12, message: 'Två grupper', lang: 'sv', status: 'new', created_at: new Date().toISOString() }]);
    if (p === '/rest/v1/rpc/owner_classes') return json(route, state.ownerClasses ?? []);
    if (p === '/rest/v1/rpc/create_class') {
      state.createdClass = body;
      state.ownerClasses = [{ id: 'cl2', name: body.p_name, school: body.p_school, teacher_email: body.p_teacher_email, seats: body.p_seats, members: 0, licence_until: body.p_until, join_code: 'WXYZ6789' }];
      return json(route, { ok: true, id: 'cl2', code: 'WXYZ6789' });
    }
    if (p === '/rest/v1/rpc/handle_school_request') {
      state.handledRequest = body.p_id;
      return none();
    }
    if (p === '/functions/v1/referral-code') {
      state.refCode = 'SARA-7K3D';
      return json(route, { code: state.refCode });
    }
    if (p === '/rest/v1/referral_codes') return json(route, state.refCode ? [{ code: state.refCode }] : []);
    if (p === '/rest/v1/referrals') return json(route, state.referrals ?? []);
    if (p === '/functions/v1/create-checkout') {
      state.checkoutRef = body.ref;
      state.checkoutPlan = body.plan;
      state.checkouts = (state.checkouts ?? 0) + 1;
      // The first time (straight after sign-up) the learner backs out of Stripe's page.
      if (state.checkouts === 1 && state.backOutFirst) return json(route, { url: `${BASE}/subscribe?status=cancelled` });
      // Pretend Stripe took the payment and the webhook saved the subscription.
      state.subs = [{ id: 'sub_test', status: 'active', current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), cancel_at_period_end: false, created_at: new Date().toISOString(), currency: 'usd', plan: body.plan ?? 'monthly' }];
      return json(route, { url: `${BASE}/subscribe?status=success` });
    }
    if (p === '/functions/v1/withdraw') {
      state.subs = state.subs.map((s) => ({ ...s, status: 'canceled' }));
      return json(route, { ok: true, refunded: 449, currency: 'usd' });
    }
    if (p === '/functions/v1/billing-portal') return json(route, { url: `${BASE}/settings` });
    if (p === '/functions/v1/delete-account') {
      // The real function refuses unless the person logged in within the last 10 minutes.
      if (state.forceReauth) return json(route, { error: 'reauth_required' }, 403);
      state.deleted = true;
      return json(route, { ok: true });
    }
    return json(route, { message: `not mocked: ${p}` }, 404);
  }
  return { state, handle };
}

async function run() {
  console.log('\naccounts (mocked Supabase and Stripe)');
  // A fake microphone, so Speak & compare can record.
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'en-US', permissions: ['microphone'] });
  // Every page gets the production Content-Security-Policy; anything it blocks fails the test.
  const cspViolations = enforceCsp(browser, BASE, cspFromNetlify(ROOT, 'mock.supabase.test'), context);
  const page = await context.newPage();
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
  // As from the website's price list, with the Family plan chosen.
  await page.goto(`${BASE}/sign-up?plan=family_monthly`);
  await page.getByTestId('screen-sign-up').waitFor();

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
  ok(backend.state.checkouts === 1 && backend.state.checkoutPlan === 'family_monthly', 'after sign-up the app goes straight to the payment page, for the plan chosen on the website');
  await page.getByTestId('screen-subscribe').waitFor({ timeout: 10000 });
  ok(true, 'backing out of the payment page shows the plans (no free trial)');
  ok(/\$7\.49 \/ month/.test(await page.getByTestId('sub-price').innerText()), 'the plan chosen on the website stays selected (Family, US: $7.49 / month)');
  await page.getByTestId('plan-just').click();
  ok(/\$4\.49 \/ month/.test(await page.getByTestId('sub-price').innerText()), 'just me: the local price (US: $4.49 / month)');
  await page.getByTestId('period-year').click();
  ok(/\$39\.99 \/ year/.test(await page.getByTestId('sub-price').innerText()), 'yearly: $39.99 / year');
  ok((await page.getByTestId('sub-per-month').innerText()).includes('$3.33'), 'and what that is per month');
  await page.getByTestId('plan-family').click();
  ok(/\$66\.99 \/ year/.test(await page.getByTestId('sub-price').innerText()), 'Family, yearly: $66.99 / year');
  await page.getByTestId('period-month').click();
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
  ok(backend.state.checkoutPlan === 'family_monthly', 'the payment page was for the plan picked (Family, monthly)');
  ok((await page.getByTestId('home-greeting').innerText()).includes('Sara'), 'home greets the learner by the name from sign-up');
  await page.waitForTimeout(2000);
  ok(backend.state.progress?.profile?.name === 'Sara', 'progress is saved to the account');

  // Settings: subscription, the 14-day withdrawal button, log out.
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-account').waitFor();
  ok((await page.getByTestId('sub-state').innerText()).startsWith('Active · renews on'), 'settings show the active subscription');
  ok((await page.getByTestId('sub-plan').innerText()) === 'Family plan, monthly', 'and which plan it is');
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
  await page.getByTestId('chapter-start').click();
  await page.getByTestId('lesson-player').waitFor();
  ok((await page.getByTestId('report-open').count()) === 0, 'a child\'s lesson has no "Report a mistake" button');
  await page.getByTestId('lesson-close').click();
  await page.getByTestId('quit-confirm').click();
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

  // The Family plan on the Me tab: places, the invite link, and taking an adult off the plan.
  backend.state.familyMembers = [{ user_id: '22222222-2222-4222-8222-222222222222', name: 'Ada', joined_at: new Date().toISOString() }];
  await page.reload();
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('family-plan-card').waitFor({ timeout: 10000 });
  ok((await page.getByTestId('family-places').innerText()) === '3 of 6 places taken', 'the payer sees how many of the 6 places are taken (payer, an adult, a child)');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.getByTestId('family-share').click();
  await page.getByTestId('form-ok').waitFor({ timeout: 5000 }).catch(() => undefined);
  ok((await page.evaluate(() => navigator.clipboard.readText())) === 'https://app.yigaoluganda.com/sign-up?family=OWNR2345&lang=en', 'the invite link signs people up into the family');
  await shot(page, '04b-family');
  await page.getByTestId('family-remove-Ada').click();
  await page.waitForTimeout(1500);
  ok((backend.state.familyMembers ?? []).length === 0 && (await page.getByTestId('family-places').innerText()) === '2 of 6 places taken', 'the payer can take an adult off the plan');
  await page.getByTestId('tab-home').click();
  await page.getByTestId('screen-home').waitFor();

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

  // Report a mistake, from inside a lesson.
  // Opened straight from a link (an e-mail, a bookmark) in a new tab: a paying learner lands on the
  // lesson, not on the start page or the plan.
  for (let attempt = 0; attempt < 3; attempt++) {
    const tab = await page.context().newPage();
    await tab.route(`${API}/**`, backend.handle);
    await tab.route('https://accounts.google.com/**', (route) => route.abort());
    const trail = [];
    tab.on('framenavigated', (f) => f === tab.mainFrame() && trail.push(new URL(f.url()).pathname));
    await tab.goto(`${BASE}/lesson/c03-l1`);
    const opened = await tab.getByTestId('lesson-player').waitFor({ timeout: 15000 }).then(() => true, () => false);
    await tab.waitForTimeout(800);
    ok(opened && trail.every((x) => x === '/lesson/c03-l1'), `a link to a lesson opens the lesson (try ${attempt + 1}: ${trail.join(' → ')})`);
    await tab.close();
  }
  await page.goto(`${BASE}/lesson/c03-l1`);
  await page.getByTestId('lesson-player').waitFor({ timeout: 15000 });
  await page.getByTestId('report-open').click();
  await page.getByTestId('report-sheet').waitFor();
  ok(await page.getByTestId('report-send').isDisabled(), 'a report needs to say what is wrong');
  await page.getByTestId('report-kind-translation').click();
  await page.getByTestId('report-note').fill('Should be "hello, friend"');
  await shot(page, '06-report');
  await page.getByTestId('report-send').click();
  await page.getByTestId('report-sent').waitFor({ timeout: 10000 });
  const rep = backend.state.reports?.[0] ?? {};
  ok(rep.kind === 'translation' && rep.item_type === 'phrase' && rep.lesson_id === 'c03-l1' && rep.note === 'Should be "hello, friend"' && rep.platform === 'web', '"Report a mistake" sends what is wrong, where, and the note');
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.getByTestId('lesson-close').click();
  await page.getByTestId('quit-confirm').click();

  // Ask a native speaker, from Speak & compare.
  await page.goto(`${BASE}/practice/speak?id=oli-otya`);
  await page.getByTestId('mic').waitFor({ timeout: 15000 });
  await page.getByTestId('mic').click();
  await page.waitForTimeout(1200);
  await page.getByTestId('mic').click();
  const asked = await page.getByTestId('ask-native').waitFor({ timeout: 8000 }).then(() => true, () => false);
  ok(asked, 'after recording, Speak & compare offers "Ask a native speaker"');
  if (asked) {
    await page.getByTestId('ask-send').click();
    await page.getByTestId('ask-sent').waitFor({ timeout: 10000 }).catch(() => undefined);
    const up = backend.state.uploads?.[0];
    const fc = backend.state.feedbackCalls?.[0];
    ok(Boolean(up) && up.size > 0 && up.type.startsWith('audio/') && !up.type.includes(';'), `the recording is uploaded as audio${up ? ` (${up.type}, ${up.size} bytes)` : ''}`);
    ok(fc?.p_phrase === 'oli-otya' && fc?.p_audio_path === up?.path && fc?.p_lang === 'en', 'and sent to the review list for that phrase');
    await shot(page, '07-ask-native');
  }

  // The answer shows on the Me tab.
  backend.state.feedback = [
    { id: 'f1', phrase_id: 'oli-otya', status: 'answered', rating: 'almost', tip: 'Make the first syllable a little longer.', created_at: new Date().toISOString(), answered_at: new Date().toISOString(), seen_at: null },
    { id: 'f2', phrase_id: 'gyendi', status: 'open', rating: null, tip: null, created_at: new Date().toISOString(), answered_at: null, seen_at: null },
  ];
  await page.goto(BASE);
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('feedback-new').waitFor({ timeout: 8000 });
  ok((await page.getByTestId('feedback-status').innerText()) === '1 new answer', 'the Me tab says there is a new answer');
  await page.getByTestId('feedback-open').click();
  await page.getByTestId('screen-feedback').waitFor();
  ok((await page.getByTestId('feedback-rating').innerText()) === 'Almost there' && (await page.getByTestId('feedback-tip').innerText()).includes('first syllable'), 'the feedback page shows the rating and the tip');
  await page.waitForTimeout(500);
  ok(backend.state.seen === true, 'and marks the answer as read');
  await shot(page, '08-feedback');

  // Reviewing (the owner): rate a recording, close a report, add a reviewer.
  backend.state.role = 'owner';
  backend.state.openRequests = [{ id: 'r1', phrase_id: 'oli-otya', status: 'open', rating: null, tip: null, created_at: new Date().toISOString(), answered_at: null, seen_at: null, lang: 'sv', audio_path: 'u/oli-otya-1.webm' }];
  backend.state.openReports = [{ id: 'rep1', kind: 'audio', item_type: 'phrase', item_id: 'oli-otya', lesson_id: 'c03-l1', note: 'Too quiet', lang: 'en', platform: 'web', app_version: '2.0.0', created_at: new Date().toISOString() }];
  await page.goto(`${BASE}/settings`);
  await page.getByTestId('open-review').waitFor({ timeout: 15000 });
  await page.getByTestId('open-review').click();
  await page.getByTestId('review-recording').waitFor({ timeout: 10000 });
  ok((await page.getByTestId('review-recording').innerText()).includes('Write the tip in Swedish'), 'a reviewer sees the recording and which language to answer in');
  await page.getByTestId('review-play').click();
  await page.waitForTimeout(500);
  ok(backend.state.calls.some((c) => c.startsWith('POST /storage/v1/object/sign/recordings/')), 'playing a recording asks for a private, short-lived link');
  await page.getByTestId('review-rate-good').click();
  await page.getByTestId('review-tip').fill('Bulungi nnyo!');
  await shot(page, '09-review');
  await page.getByTestId('review-send').click();
  await page.waitForTimeout(800);
  ok(backend.state.answered?.p_id === 'r1' && backend.state.answered?.p_rating === 'good' && backend.state.answered?.p_tip === 'Bulungi nnyo!', 'the answer is sent with the rating and tip');
  ok((await page.getByTestId('review-recording').count()) === 0, 'and the recording leaves the list');
  await page.getByTestId('review-tab-reports').click();
  await page.getByTestId('review-report').waitFor();
  ok((await page.getByTestId('review-report').innerText()).toLowerCase().includes('the audio is wrong'), 'reports show what is wrong');
  await page.getByTestId('review-fixed').click();
  await page.waitForTimeout(800);
  ok(backend.state.resolved?.p_id === 'rep1' && backend.state.resolved?.p_status === 'fixed', 'a report can be closed as fixed');
  await page.getByTestId('review-tab-reviewers').click();
  await page.getByTestId('reviewer-email').fill('nobody@example.com');
  await page.getByTestId('reviewer-add').click();
  await page.getByTestId('form-error').waitFor({ timeout: 5000 });
  ok((await page.getByTestId('form-error').innerText()).includes('No account'), 'adding an address with no account says so');
  await page.getByTestId('reviewer-email').fill('nakato@example.com');
  await page.getByTestId('reviewer-add').click();
  await page.getByText('nakato@example.com').waitFor({ timeout: 5000 });
  ok(backend.state.setReviewer?.p_email === 'nakato@example.com' && backend.state.setReviewer?.p_on === true, 'the owner adds a reviewer by e-mail');
  // The owner's dashboard.
  await page.goto(`${BASE}/settings`);
  await page.getByTestId('open-dashboard').waitFor({ timeout: 15000 });
  await page.getByTestId('open-dashboard').click();
  await page.getByTestId('dashboard').waitFor({ timeout: 10000 });
  ok((await page.getByTestId('dash-paying').innerText()).includes('3'), 'the owner\'s dashboard shows paying learners');
  ok((await page.getByTestId('dash-plans').innerText()).includes('Family plan, yearly: 1'), 'and how many pay for each plan');
  ok((await page.getByTestId('dash-revenue').innerText()).includes('8.98'), 'and the monthly revenue before VAT, per currency');
  ok((await page.getByTestId('dashboard').innerText()).includes('Oli otya?'), 'and the most reported phrases');
  await shot(page, '10-dashboard');
  await page.getByTestId('review-tab-schools').click();
  await page.getByTestId('school-request').waitFor({ timeout: 8000 });
  ok((await page.getByTestId('school-request').innerText()).includes('Uppsala kommun'), 'the owner sees requests from the For schools form');
  await page.getByTestId('new-class-name').fill('Luganda 4B');
  await page.getByTestId('new-class-school').fill('Uppsala kommun');
  await page.getByTestId('new-class-teacher').fill('teacher@example.se');
  await page.getByTestId('new-class-create').click();
  await page.getByTestId('form-ok').waitFor({ timeout: 5000 });
  ok((await page.getByTestId('form-ok').innerText()).includes('WXYZ6789') && backend.state.createdClass?.p_seats === 30 && /^\d{4}-\d{2}-\d{2}$/.test(backend.state.createdClass?.p_until ?? ''), 'the owner creates a class for a teacher and gets its code');
  await page.getByTestId('owner-class').waitFor();
  backend.state.licences = [{ class_id: 'cl1', name: 'Luganda 4B', school: 'Uppsala kommun', licence_until: '2099-06-30', teacher: true }];
  backend.state.teacherClasses = [{ id: 'cl1', name: 'Luganda 4B', school: 'Uppsala kommun', join_code: 'ABCD2345', seats: 30, licence_until: '2099-06-30' }];
  await page.goto(`${BASE}/`);
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-classes').click();
  await page.getByTestId('class-student').first().waitFor({ timeout: 8000 });
  ok((await page.getByTestId('class-join-code').innerText()) === 'ABCD2345' && (await page.getByTestId('class-student').count()) === 2, 'a teacher sees the class code and each student');
  ok((await page.getByTestId('class-student').first().innerText()).includes('6 lessons'), 'with their progress');
  await shot(page, '12-teacher');
  backend.state.licences = [];
  backend.state.role = null;

  // Settings: tips by e-mail, download my data, and change the e-mail address.
  await page.goto(`${BASE}/settings`);
  await page.getByTestId('download-data').waitFor({ timeout: 15000 });
  await page.getByTestId('settings-tips').click();
  await page.waitForTimeout(2500);
  ok(backend.state.profile?.tips_email === false, 'turning off "Tips by e-mail" is saved to the account');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-data').click()]);
  const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));
  ok(
    download.suggestedFilename().startsWith('yiga-oluganda-data-') && exported.account?.email === 'sara@example.com' && exported.this_device?.profile?.name === 'Sara' && Array.isArray(exported.certificates) && Array.isArray(exported.reported_mistakes),
    '"Download my data" saves a file with the account, progress, certificates and reports',
  );
  await page.getByTestId('change-email').click();
  await page.getByTestId('new-email').fill('sara.new@example.com');
  await page.getByTestId('email-save').click();
  await page.getByTestId('form-ok').waitFor({ timeout: 5000 });
  ok(backend.state.emailChange === 'sara.new@example.com' && (await page.getByTestId('form-ok').innerText()).includes('sara.new@example.com'), 'changing the e-mail sends a link to the new address and says where to look');

  // Refer a friend, the inviter's side.
  backend.state.referrals = [{ status: 'joined' }, { status: 'rewarded' }];
  await page.goto(`${BASE}/`);
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('invite-get').click();
  await page.getByTestId('invite-code').waitFor({ timeout: 8000 });
  ok((await page.getByTestId('invite-code').innerText()) === 'SARA-7K3D', 'a paying learner gets a personal invite code');
  ok((await page.getByTestId('invite-counts').innerText()) === '2 friend(s) joined · 1 free month(s) earned', 'and sees how many friends joined and the free months earned');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.getByTestId('invite-share').click();
  await page.getByTestId('form-ok').waitFor({ timeout: 5000 }).catch(() => undefined);
  ok((await page.evaluate(() => navigator.clipboard.readText())) === 'https://yigaoluganda.com/?ref=SARA-7K3D', 'the invite link goes to the website with the code');
  await shot(page, '11-invite');
  await page.goto(`${BASE}/`);
  await page.getByTestId('screen-home').waitFor({ timeout: 15000 });

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
  await page.getByTestId('class-open').click();
  await page.getByTestId('class-code').fill('wrong-123');
  await page.getByTestId('class-join').click();
  await page.getByTestId('form-error').waitFor({ timeout: 5000 });
  ok((await page.getByTestId('form-error').innerText()).includes('no class with that code'), 'a wrong class code says so');

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

  // The link in the "change e-mail address" e-mail.
  const changeLink = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const clBackend = fakeBackend();
  clBackend.state.users.set('ada@example.com', 'a-good-password');
  clBackend.state.profile = { name: 'Ada', ui_lang: 'en', created_at: new Date().toISOString() };
  await changeLink.route(`${API}/**`, clBackend.handle);
  await changeLink.goto(`${BASE}/confirm?token_hash=good-code&type=email_change&lang=en`);
  await changeLink.getByTestId('confirm-submit').waitFor({ timeout: 15000 });
  ok((await changeLink.getByText('Confirm your e-mail address').count()) > 0, 'the change-address link opens "Confirm your e-mail address"');
  await changeLink.getByTestId('confirm-submit').click();
  await changeLink.waitForTimeout(1500);
  ok(clBackend.state.verified === 'email_change', 'and confirming it verifies the address change');
  await changeLink.close();

  // A student who comes with the teacher's class link: sign up, and the class opens the course (no payment).
  const student = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const sBackend = fakeBackend();
  await student.route(`${API}/**`, sBackend.handle);
  await student.route('https://accounts.google.com/**', (route) => route.abort());
  await student.goto(`${BASE}/sign-up?class=abcd2345`);
  await student.getByTestId('class-banner').waitFor({ timeout: 15000 });
  ok(true, 'a student with a class link sees that there is nothing to pay');
  await student.getByTestId('signup-name').fill('Kato');
  await student.getByTestId('signup-email').fill('kato@example.com');
  await student.getByTestId('signup-password').fill('kampala123');
  await student.getByTestId('signup-submit').click();
  await student.getByTestId('screen-home').waitFor({ timeout: 20000 });
  ok(sBackend.state.joined === 'ABCD2345' && !sBackend.state.checkouts, 'signing up joins the class and opens the course without the payment page');
  await student.getByTestId('tab-profile').click();
  await student.getByTestId('open-settings').click();
  await student.getByTestId('licence-card').waitFor({ timeout: 8000 });
  ok((await student.getByTestId('licence-card').innerText()).includes('Luganda 4B'), 'settings show the school licence');
  await student.close();

  // Someone invited to a Family plan: sign up with the link, and the plan opens the course (no payment).
  const member = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const mBackend = fakeBackend();
  await member.route(`${API}/**`, mBackend.handle);
  await member.route('https://accounts.google.com/**', (route) => route.abort());
  await member.goto(`${BASE}/sign-up?family=famx2345`);
  await member.getByTestId('family-banner').waitFor({ timeout: 15000 });
  ok(true, 'someone with a family invite link sees that there is nothing to pay');
  await member.getByTestId('signup-name').fill('Ada');
  await member.getByTestId('signup-email').fill('ada@example.com');
  await member.getByTestId('signup-password').fill('kampala123');
  await member.getByTestId('signup-submit').click();
  await member.getByTestId('screen-home').waitFor({ timeout: 20000 });
  ok(mBackend.state.joinedFamily === 'FAMX2345' && !mBackend.state.checkouts, 'signing up joins the Family plan and opens the course without the payment page');
  ok((await member.getByTestId('learner-chip').count()) === 0, 'an adult on someone else\'s Family plan has no children\'s profiles of their own');
  await member.getByTestId('tab-profile').click();
  await member.getByTestId('family-member-card').waitFor({ timeout: 8000 });
  ok((await member.getByTestId('family-member-card').innerText()).includes('Sara pays for'), 'the Me tab says whose Family plan it is');
  await member.getByTestId('family-leave').click();
  await member.getByTestId('family-leave-confirm').click();
  await member.getByTestId('screen-subscribe').waitFor({ timeout: 10000 });
  ok(mBackend.state.familyMember === false, 'leaving the Family plan ends access (a plan of their own is needed)');
  await member.close();

  // Deleting the account asks for the password again.
  const del = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const dBackend = fakeBackend();
  dBackend.state.users.set('del@example.com', 'a-good-password');
  dBackend.state.profile = { name: 'Del', ui_lang: 'en', created_at: new Date().toISOString() };
  dBackend.state.subs = [{ id: 'sub_d', status: 'active', current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), cancel_at_period_end: false, created_at: new Date(Date.now() - 30 * 864e5).toISOString(), currency: 'eur' }];
  await del.route(`${API}/**`, dBackend.handle);
  await del.route('https://accounts.google.com/**', (route) => route.abort());
  await del.goto(`${BASE}/sign-in`);
  await del.getByTestId('signin-email').fill('del@example.com');
  await del.getByTestId('signin-password').fill('a-good-password');
  await del.getByTestId('signin-submit').click();
  await del.getByTestId('screen-home').waitFor({ timeout: 20000 });
  await del.goto(`${BASE}/settings`);
  await del.getByTestId('delete-account').waitFor({ timeout: 15000 });
  await del.getByTestId('delete-account').click();
  ok(await del.getByTestId('delete-confirm').isDisabled(), 'deleting the account first asks for the password');
  await del.getByTestId('delete-password').fill('wrong-password');
  await del.getByTestId('delete-confirm').click();
  await del.getByTestId('delete-sheet').getByTestId('form-error').waitFor({ timeout: 8000 });
  ok(!dBackend.state.deleted && (await del.getByTestId('delete-sheet').getByTestId('form-error').innerText()).includes('Wrong e-mail or password'), 'a wrong password deletes nothing');
  dBackend.state.forceReauth = true;
  await del.getByTestId('delete-password').fill('a-good-password');
  await del.getByTestId('delete-confirm').click();
  await del.waitForTimeout(1500);
  ok(!dBackend.state.deleted && (await del.getByTestId('delete-sheet').getByTestId('form-error').innerText()).includes('log in again'), 'when the server wants a fresh login, it says so');
  dBackend.state.forceReauth = false;
  await del.getByTestId('delete-confirm').click();
  await del.getByTestId('screen-sign-in').waitFor({ timeout: 15000 });
  ok(dBackend.state.deleted === true, 'with the right password, the account is deleted');
  await del.close();

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
  await goog.goto(`${BASE}/sign-up?lang=sv&ref=sara-7k3d`);
  await goog.getByTestId('gis-button').waitFor({ timeout: 15000 });
  ok(true, 'sign-up shows "Continue with Google"');
  ok(await goog.getByTestId('invite-banner').isVisible(), 'a friend who comes with an invite sees that the first month is free');
  ok((await goog.evaluate(() => window.__gisOptions?.locale)) === 'sv', 'Google\'s button follows the app language');
  await goog.getByTestId('gis-button').click();
  await goog.getByTestId('screen-home').waitFor({ timeout: 20000 }).catch(async (e) => {
    await goog.screenshot({ path: path.join(OUT, 'google-fail.png') });
    console.log('google step stuck at', goog.url());
    throw e;
  });
  ok(gBackend.state.googleSignIns === 1, 'Google sign-in logs in through Supabase (nonce checked)');
  ok(gBackend.state.checkouts === 1, 'a new Google account goes straight to the payment page');
  ok(gBackend.state.checkoutRef === 'SARA-7K3D', 'and the invite code goes with them to the payment page');
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

  ok(cspViolations.length === 0, `the Content-Security-Policy blocks nothing the app needs${cspViolations.length ? `: ${[...new Set(cspViolations)].slice(0, 3).join(' | ')}` : ''}`);
  await browser.close();
}

try {
  await run();
} finally {
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
