// Browser test for the landing site (yigaoluganda.com), served from landing/dist with the
// Content-Security-Policy from landing/netlify.toml: the invite banner, the certificate check and
// the schools form, with Supabase mocked. Run `node landing/build.mjs` first.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cspFromNetlify, enforceCsp } from './csp.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'landing');
const dist = path.join(root, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  let file = path.join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const SUPABASE = 'https://qbagcpemtsqaoykwqger.supabase.co';
const browser = await chromium.launch();
const violations = enforceCsp(browser, base, cspFromNetlify(root).replace('upgrade-insecure-requests', ''));
let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
};

try {
  // Invite link: the banner shows and sign-up links carry the code.
  {
    const page = await browser.newPage();
    await page.goto(`${base}/?ref=sara-7k3d`);
    await page.waitForLoadState('networkidle');
    check(await page.locator('#invite').isVisible(), 'an invite link shows the invite banner');
    const hrefs = await page.locator('a[href*="/sign-up"]').evaluateAll((as) => as.map((a) => a.href));
    check(hrefs.length > 0 && hrefs.every((h) => h.includes('ref=SARA-7K3D')), 'sign-up links carry the invite code');
    await page.close();
  }

  // Certificate check.
  {
    const page = await browser.newPage();
    let sent = null;
    await page.route(`${SUPABASE}/rest/v1/rpc/verify_certificate`, async (r) => {
      sent = { body: r.request().postDataJSON(), apikey: r.request().headers().apikey };
      await r.fulfill({ json: [{ learner_name: 'Sara Test', part: 1, phrases: 120, issued_at: '2026-11-01T10:00:00Z' }] });
    });
    await page.goto(`${base}/verify/?c=yo-abcd-efgh-jk23`);
    await page.locator('.verify-name').waitFor({ timeout: 5000 });
    check((await page.locator('.verify-name').textContent()) === 'Sara Test', 'the certificate check shows the learner name');
    check(sent?.body?.p_code === 'YO-ABCD-EFGH-JK23' && /^sb_publishable_/.test(sent?.apikey ?? ''), 'the check sends the normalised code with the publishable key');
    check(await page.getByText('does not check identity').isVisible(), 'the page says the name is as the learner entered it');
    await page.close();
  }

  // Schools form: success, then the per-visitor limit.
  {
    const page = await browser.newPage();
    let body = null;
    let status = 200;
    await page.route(`${SUPABASE}/functions/v1/school-request`, async (r) => {
      body = r.request().postDataJSON();
      await r.fulfill(status === 200 ? { json: { ok: true } } : { status, json: { error: 'too_many' } });
    });
    await page.goto(`${base}/schools/`);
    await page.locator('button[type=submit]').click();
    check(await page.getByText('Please fill in your name').isVisible(), 'the schools form asks for the missing fields');
    check(body === null, 'nothing is sent while fields are missing');
    await page.fill('input[name=name]', 'Anna Teacher');
    await page.fill('input[name=school]', 'Kampala Svenska Skolan');
    await page.fill('input[name=email]', 'anna@example.org');
    await page.fill('input[name=students]', '25');
    await page.locator('button[type=submit]').click();
    await page.getByText('Thank you!').waitFor({ timeout: 5000 });
    check(body?.name === 'Anna Teacher' && body?.students === 25 && body?.lang === 'en' && !('p_name' in body), 'the form posts to the school-request function');
    check(await page.locator('#school-form').isHidden(), 'the form hides after sending');

    status = 429;
    await page.goto(`${base}/sv/skolor/`);
    await page.fill('input[name=name]', 'Anna');
    await page.fill('input[name=school]', 'Skolan');
    await page.fill('input[name=email]', 'anna@example.org');
    await page.locator('button[type=submit]').click();
    await page.getByText('För många förfrågningar').waitFor({ timeout: 5000 });
    check(true, 'too many requests shows the limit message (Swedish)');
    check(await page.locator('#school-form').isVisible(), 'the form stays after a refusal');
    await page.close();
  }

  check(violations.length === 0, `the Content-Security-Policy blocks nothing${violations.length ? `: ${violations.join(' | ')}` : ''}`);
} catch (e) {
  console.error(e);
  failed++;
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `\n${failed} failed` : '\nAll landing checks passed');
process.exit(failed ? 1 : 0);
