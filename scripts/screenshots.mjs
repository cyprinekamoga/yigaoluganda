// Screenshots of the app for the landing page, in English and Swedish.
// Usage:
//   EXPO_PUBLIC_E2E=1 npx expo export -p web && node scripts/screenshots.mjs
// Writes PNGs to e2e-shots/screens-<lang>/; `npm run screens` converts them to
// landing/assets/screens/<name>.webp (English) and landing/assets/screens/sv/<name>.webp (Swedish).
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8097;
const BASE = `http://localhost:${PORT}`;

if (!existsSync(path.join(ROOT, 'dist', 'sw.js'))) execFileSync('node', [path.join(ROOT, 'scripts/postexport.mjs'), 'dist'], { stdio: 'ignore' });
const server = spawn('node', [path.join(ROOT, 'scripts/serve.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const chapters = JSON.parse(readFileSync(path.join(ROOT, 'content/unit-1/chapters.json'), 'utf8'));
/** The first three chapters (open from the start) count as done, so chapter 4 (thanks: weebale) opens. */
const opened = chapters.slice(0, 3).flatMap((c) => c.lessons.map((l) => l.id));

const vis = (page, id) => page.getByTestId(id).first().isVisible().catch(() => false);

async function play(page, dir, want) {
  const shot = async (name) => {
    if (!want.has(name)) return;
    want.delete(name);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
  };
  for (let guard = 0; guard < 120; guard++) {
    await page.waitForTimeout(200);
    if (await vis(page, 'lesson-complete')) return shot('complete');
    if (await vis(page, 'feedback-continue')) {
      await shot('choice');
      await page.getByTestId('feedback-continue').click();
      continue;
    }
    if (await vis(page, 'option-answer')) {
      await page.getByTestId('option-answer').click();
      await page.getByTestId('check').click();
      continue;
    }
    if (await vis(page, 'type-input')) {
      await page.getByTestId('type-input').fill(await page.getByTestId('type-expected').textContent());
      await page.getByTestId('check').click();
      continue;
    }
    if (await vis(page, 'tile-ans-0')) {
      await shot('build-start');
      for (let i = 0; i < 12; i++) {
        const tile = page.getByTestId(`tile-ans-${i}`);
        if (!(await tile.count())) break;
        await tile.click();
        if (i === 1) await shot('build');
      }
      await page.getByTestId('check').click();
      continue;
    }
    const lefts = page.locator('[data-testid^="match-lg-"]');
    if ((await lefts.count()) > 0 && (await lefts.first().isVisible().catch(() => false))) {
      const ids = await lefts.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice('match-lg-'.length)));
      for (const [i, id] of ids.entries()) {
        await page.getByTestId(`match-lg-${id}`).click();
        await page.getByTestId(`match-tr-${id}`).click();
        if (i === 1) await shot('match');
      }
      continue;
    }
    if (await vis(page, 'dialogue-answer')) {
      await shot('dialogue');
      await page.getByTestId('dialogue-answer').click();
      continue;
    }
    if (await vis(page, 'speak-skip')) {
      await page.getByTestId('speak-skip').click();
      continue;
    }
    if (await vis(page, 'continue')) {
      if (await vis(page, 'intro-lg')) await shot('intro');
      await page.getByTestId('continue').click();
      continue;
    }
  }
}

const browser = await chromium.launch();
for (const lang of ['en', 'sv']) {
  const dir = path.join(ROOT, 'e2e-shots', `screens-${lang}`);
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: lang === 'sv' ? 'sv-SE' : 'en-GB' });
  await page.goto(BASE);
  await page.getByTestId('screen-onboarding').waitFor();
  await page.getByTestId(`lang-${lang}`).click();
  await page.getByTestId('name-input').fill('Sara');
  await page.getByTestId('onb-go').click();
  await page.getByTestId('screen-home').waitFor();
  await page.evaluate((ids) => {
    const raw = JSON.parse(localStorage.getItem('yiga-oluganda-v2'));
    for (const id of ids) raw.state.done[id] = { completedAt: Date.now() - 86_400_000, bestAccuracy: 1, plays: 1 };
    raw.state.placementSeen = true;
    localStorage.setItem('yiga-oluganda-v2', JSON.stringify(raw));
  }, opened);
  // Courtesy & Magic Words, lesson 1 (weebale): new phrase, feedback, matching, building, the end.
  await page.goto(`${BASE}/lesson/c02-l1`);
  await page.getByTestId('lesson-player').waitFor({ timeout: 15000 });
  const want = new Set(['intro', 'choice', 'match', 'build', 'complete']);
  await play(page, dir, want);
  // A conversation (Introductions, lesson 2).
  await page.goto(`${BASE}/lesson/c07-l2`);
  await page.getByTestId('lesson-player').waitFor({ timeout: 15000 });
  await play(page, dir, new Set(['dialogue']));
  console.log(`${lang}: ${want.size ? `missing ${[...want].join(', ')}` : 'all screens'} → ${path.relative(ROOT, dir)}`);
  await page.close();
}
await browser.close();
server.kill();
