// End-to-end check of the web build with Playwright (pre-installed Chromium).
// Usage: EXPO_PUBLIC_E2E=1 npx expo export -p web && node scripts/e2e.mjs [--shots]
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
const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

const server = spawn('node', [path.join(ROOT, 'scripts/serve.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
};

const vis = async (page, id, timeout = 400) => page.getByTestId(id).first().isVisible({ timeout }).catch(() => false);

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

/** Play whatever lesson is open until the completion screen. `wrongOnce` answers one choice wrongly. */
async function playLesson(page, { wrongOnce = false, shotPrefix = null } = {}) {
  let wrongDone = !wrongOnce;
  const seen = new Set();
  for (let guard = 0; guard < 120; guard++) {
    await page.waitForTimeout(150);
    if (await vis(page, 'lesson-complete', 200)) return true;
    if (await vis(page, 'feedback-continue', 100)) {
      if (shotPrefix && !seen.has('fb')) {
        seen.add('fb');
        await shot(page, `${shotPrefix}-feedback`);
      }
      await page.getByTestId('feedback-continue').click();
      continue;
    }
    if (await vis(page, 'option-answer', 100)) {
      if (shotPrefix && !seen.has('choice')) {
        seen.add('choice');
        await shot(page, `${shotPrefix}-choice`);
      }
      if (!wrongDone) {
        await page.getByTestId('option').first().click();
        wrongDone = true;
      } else await page.getByTestId('option-answer').click();
      await page.getByTestId('check').click();
      continue;
    }
    if (await vis(page, 'tile-ans-0', 100)) {
      if (shotPrefix && !seen.has('build')) {
        seen.add('build');
        await shot(page, `${shotPrefix}-build`);
      }
      for (let i = 0; i < 12; i++) {
        const tile = page.getByTestId(`tile-ans-${i}`);
        if (!(await tile.count())) break;
        await tile.click();
      }
      await page.getByTestId('check').click();
      continue;
    }
    const lefts = page.locator('[data-testid^="match-lg-"]');
    if ((await lefts.count()) > 0 && (await lefts.first().isVisible().catch(() => false))) {
      if (shotPrefix && !seen.has('match')) {
        seen.add('match');
        await shot(page, `${shotPrefix}-match`);
      }
      const ids = await lefts.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice('match-lg-'.length)));
      for (const id of ids) {
        await page.getByTestId(`match-lg-${id}`).click();
        await page.getByTestId(`match-tr-${id}`).click();
      }
      await page.waitForTimeout(400);
      continue;
    }
    if (await vis(page, 'dialogue-answer', 100)) {
      if (shotPrefix && !seen.has('dialogue')) {
        seen.add('dialogue');
        await shot(page, `${shotPrefix}-dialogue`);
      }
      await page.getByTestId('dialogue-answer').click();
      continue;
    }
    if (await vis(page, 'speak-skip', 100)) {
      await page.getByTestId('speak-skip').click();
      continue;
    }
    if (await vis(page, 'continue', 100)) {
      const kind = (await vis(page, 'intro-lg', 50)) ? 'intro' : (await vis(page, 'tip-card', 50)) ? 'tip' : 'other';
      if (shotPrefix && !seen.has(kind)) {
        seen.add(kind);
        await shot(page, `${shotPrefix}-${kind}`);
      }
      await page.getByTestId('continue').click();
      continue;
    }
  }
  return false;
}

async function run(viewport, label) {
  console.log(`\n${label} (${viewport.width}×${viewport.height})`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(BASE);
  await page.getByTestId('screen-onboarding').waitFor();
  await page.getByTestId('lang-sv').click();
  ok((await page.getByText('Vad heter du?').count()) > 0, 'onboarding switches to Swedish');
  await page.getByTestId('lang-en').click();
  await page.getByTestId('name-input').fill('Sara');
  await shot(page, `${label}-01-onboarding`);
  await page.getByTestId('onb-go').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('home-greeting').innerText()).includes('Sara'), 'home greets the learner by name');
  ok((await page.getByTestId('tile-c01').getAttribute('aria-label')).includes('Ready to start'), 'chapter 1 is ready');
  ok((await page.getByTestId('tile-c04').getAttribute('aria-label')).includes('Locked'), 'chapter 4 starts locked');
  await shot(page, `${label}-02-home`);

  // iOS-style large title: hidden compact title at the top, shown in the bar after scrolling
  const compactOpacity = async () => Number(await page.getByTestId('compact-title').first().evaluate((el) => getComputedStyle(el).opacity));
  ok((await compactOpacity()) < 0.1, 'large title at the top, compact title hidden');
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(500);
  ok((await compactOpacity()) > 0.9, 'scrolling folds the large title into the top bar');
  await shot(page, `${label}-02b-home-scrolled`);
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(400);

  // Locked tile explains itself
  await page.getByTestId('tile-c04').click();
  ok(await page.getByText('This chapter is locked').isVisible(), 'locked tile shows why');
  await page.keyboard.press('Escape');
  await page.getByText('Close').last().click().catch(() => undefined);

  // Chapter 2, lesson 1 — perfect run
  await page.getByTestId('tile-c02').click();
  await page.getByTestId('screen-chapter').waitFor();
  await shot(page, `${label}-03-chapter`);
  await page.getByTestId('chapter-start').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await page.getByTestId('fun-fact').waitFor({ timeout: 3000 }).then(() => true, () => false), 'new-phrase screen shows a fun fact about Uganda');
  ok(await playLesson(page, { shotPrefix: `${label}-04` }), 'finished lesson c02-l1');
  ok((await page.getByTestId('done-cowries').innerText()).includes('+10'), 'perfect lesson gives 10 cowries');
  ok((await page.getByTestId('done-summary').innerText()).includes('new phrase'), 'completion lists the phrases learned');
  ok((await page.getByTestId('done-phrases').count()) > 0, 'completion shows the learned phrases');
  await shot(page, `${label}-05-complete`);
  await page.getByTestId('complete-continue').click();

  // Lesson 2 with one wrong answer: spills a water pot, has a roleplay
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('chapter-start').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await playLesson(page, { wrongOnce: true, shotPrefix: `${label}-06` }), 'finished lesson c02-l2 with a mistake');
  ok((await page.getByTestId('done-cowries').innerText()).includes('+5'), 'lesson with a mistake gives 5 cowries');
  await page.getByTestId('complete-continue').click();
  await page.getByTestId('back').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('tile-c02').getAttribute('aria-label')).includes('Completed'), 'chapter 2 shows completed');
  ok((await page.getByTestId('tile-c04').getAttribute('aria-label')).includes('Unlocked'), 'completing a chapter unlocks chapter 4');
  ok((await page.getByTestId('stat-hearts').getAttribute('aria-label')).includes('4 of 5'), 'one water pot was spilled');
  await shot(page, `${label}-07-home-progress`);

  // Practice Lab: a review fills the water pots
  await page.getByTestId('tab-practice').click();
  await page.getByTestId('screen-practice').waitFor();
  await shot(page, `${label}-08-practice`);
  await page.getByTestId('practice-review').click();
  ok(await playLesson(page), 'finished a review round');
  ok(await page.getByText('Your water pots are full again').isVisible(), 'review fills the water pots');
  await page.getByTestId('complete-continue').click();
  await page.getByTestId('convo-dlg-tea').click();
  ok(await playLesson(page, { shotPrefix: `${label}-09` }), 'replayed a conversation');
  await page.getByTestId('complete-continue').click();

  // Phrasebook search
  await page.getByTestId('tab-dictionary').click();
  await page.getByTestId('dict-search').fill('ngenda');
  ok(await page.getByTestId('dict-nnenda').isVisible(), 'search finds ŋŋenda from "ngenda"');
  await page.getByTestId('dict-search').fill('');
  await shot(page, `${label}-10-phrasebook`);
  await page.getByTestId('dict-weebale').click();
  ok((await page.getByTestId('phrase-lg').innerText()) === 'weebale', 'phrase detail opens');
  await shot(page, `${label}-11-phrase`);
  await page.getByTestId('back').click();

  // Profile and settings
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('screen-profile').waitFor();
  ok((await page.getByTestId('tile-gems').getAttribute('aria-label')).includes('19'), 'profile shows total cowries (10 + 5 + 2 + 2)');
  ok(/Phrases learned: [1-9]/.test(await page.getByTestId('tile-phrases').getAttribute('aria-label')), 'profile shows phrases learned');
  ok(await page.getByTestId('family-card').isVisible(), 'profile has the practise-with-family card');
  await shot(page, `${label}-12-profile`);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-lang-sv').click();
  ok((await page.getByText('Inställningar').count()) > 0, 'interface switches to Swedish');
  await shot(page, `${label}-13-settings-sv`);
  await page.getByTestId('back').click();
  await page.getByTestId('tab-home').click();
  ok((await page.getByTestId('home-greeting').innerText()).includes('Vad vill du göra i dag'), 'home is in Swedish');
  await shot(page, `${label}-14-home-sv`);

  // Progress survives a reload
  await page.reload();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('tile-c02').getAttribute('aria-label')).includes('Klar'), 'progress persists after reload');

  // Reset erases progress and returns to onboarding
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('reset').click();
  await page.getByTestId('reset-confirm').click();
  ok(await page.getByTestId('screen-onboarding').waitFor({ timeout: 5000 }).then(() => true, () => false), 'reset returns to onboarding');

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await browser.close();
}

/** Part 2 and the placement test, from a fresh start. */
async function placement() {
  console.log('\nplacement test and Part 2');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE);
  await page.getByTestId('name-input').fill('Kato');
  await page.getByTestId('onb-go').click();
  await page.getByTestId('screen-home').waitFor();
  ok(await page.getByTestId('unit-2').isVisible(), 'home shows Part 2');
  ok((await page.getByTestId('tile-c13').getAttribute('aria-label')).includes('Locked'), 'Part 2 starts locked');
  ok(await page.getByTestId('placement-offer').isVisible(), 'a new learner is offered the placement test');
  await shot(page, 'mobile-15-placement-offer');

  await page.getByTestId('placement-open').click();
  await page.getByTestId('screen-placement').waitFor();
  await page.getByTestId('placement-start').click();
  // Know all 11 chapters of Part 1, then miss Part 2's first chapter twice.
  for (let i = 0; i < 11; i++) {
    await page.getByTestId('placement-answer').waitFor();
    if (i === 3) await shot(page, 'mobile-16-placement-question');
    await page.getByTestId('placement-answer').click();
    await page.waitForTimeout(750);
  }
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('placement-dont-know').waitFor();
    await page.getByTestId('placement-dont-know').click();
    await page.waitForTimeout(750);
  }
  await page.getByTestId('placement-result').waitFor();
  ok((await page.getByTestId('placement-message').innerText()).includes('11 chapters'), 'the result says 11 chapters are known');
  await shot(page, 'mobile-17-placement-result');
  await page.getByTestId('placement-skip').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('tile-c11').getAttribute('aria-label')).includes('Completed'), 'known chapters are marked done');
  ok((await page.getByTestId('tile-c12').getAttribute('aria-label')).includes('Completed'), 'Part 1\'s final conversation counts as done');
  ok((await page.getByTestId('tile-c13').getAttribute('aria-label')).includes('Ready to start'), 'Part 2 is now open');
  ok((await page.getByTestId('placement-offer').count()) === 0, 'the offer is gone after the test');
  await page.getByTestId('unit-2').scrollIntoViewIfNeeded();
  await shot(page, 'mobile-18-part-2');

  // Play the first Part 2 lesson.
  await page.getByTestId('tile-c13').click();
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('chapter-start').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await playLesson(page), 'finished the first lesson of Part 2 (Family)');
  await page.getByTestId('complete-continue').click();
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('back').click();
  await page.getByTestId('screen-home').waitFor();

  // The phrasebook includes Part 2.
  await page.getByTestId('tab-dictionary').click();
  await page.getByTestId('dict-search').fill('mwannyinaze');
  ok(await page.getByTestId('dict-mwannyinaze').isVisible(), 'the phrasebook finds Part 2 phrases');

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await browser.close();
}

try {
  await run({ width: 390, height: 844 }, 'mobile');
  await run({ width: 1280, height: 860 }, 'desktop');
  await placement();
} finally {
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
