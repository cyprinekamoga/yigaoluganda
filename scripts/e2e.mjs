// End-to-end check of the web build with Playwright (pre-installed Chromium).
// Usage: EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_KIDS=1 npx expo export -p web && node scripts/e2e.mjs [--shots]
import { createRequire } from 'node:module';
import { cspFromNetlify, enforceCsp } from './csp.mjs';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
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

// The service worker (offline copy) is written after the export, as on the live site; add it if missing.
if (!existsSync(path.join(ROOT, 'dist', 'sw.js'))) execFileSync('node', [path.join(ROOT, 'scripts/postexport.mjs'), 'dist'], { stdio: 'ignore' });
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
/** How many "write it in Luganda" steps the lessons played so far had. */
let typedSteps = 0;

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
    if (await vis(page, 'type-input', 100)) {
      if (shotPrefix && !seen.has('type')) {
        seen.add('type');
        await page.getByTestId('type-input').fill('');
        await shot(page, `${shotPrefix}-type`);
      }
      const expected = await page.getByTestId('type-expected').textContent();
      // The ŋ key and a capital letter at the start must not matter.
      const typed = expected.charAt(0).toUpperCase() + expected.slice(1);
      await page.getByTestId('type-input').fill(wrongDone ? typed : 'xx');
      wrongDone = true;
      await page.getByTestId('check').click();
      typedSteps++;
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
  const cspViolations = enforceCsp(browser, BASE, cspFromNetlify(ROOT));
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
  ok((await page.getByTestId('tile-c03').getAttribute('aria-label')).includes('Chapter 1. Informal Greetings'), 'chapter 1 is Greetings');
  ok((await page.getByTestId('tile-c03').getAttribute('aria-label')).includes('Ready to start'), 'chapter 1 is ready');
  ok((await page.getByTestId('tile-c22').getAttribute('aria-label')).includes('Chapter 3. Everyday Words'), 'chapter 3 is the new Everyday Words');
  ok((await page.getByTestId('tile-c02').getAttribute('aria-label')).includes('Locked'), 'chapter 4 starts locked');
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
  await page.getByTestId('tile-c02').click();
  ok(await page.getByText('This chapter is locked').isVisible(), 'locked tile shows why');
  await page.keyboard.press('Escape');
  await page.getByText('Close').last().click().catch(() => undefined);

  // Chapter 2 (Introductions), lesson 1 — perfect run
  await page.getByTestId('tile-c07').click();
  await page.getByTestId('screen-chapter').waitFor();
  await shot(page, `${label}-03-chapter`);
  await page.getByTestId('chapter-start').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await page.getByTestId('fun-fact').waitFor({ timeout: 3000 }).then(() => true, () => false), 'new-phrase screen shows a fun fact about Uganda');
  ok(await playLesson(page, { shotPrefix: `${label}-04` }), 'finished lesson c07-l1');
  ok(typedSteps > 0, 'the lesson asks to write a phrase in Luganda from memory');
  ok((await page.getByTestId('done-cowries').innerText()).includes('+10'), 'perfect lesson gives 10 cowries');
  ok((await page.getByTestId('done-summary').innerText()).includes('new phrase'), 'completion lists the phrases learned');
  ok((await page.getByTestId('done-phrases').count()) > 0, 'completion shows the learned phrases');
  ok(await page.getByTestId('done-goal').isVisible(), 'the first lesson of the day reaches the daily goal (1 a day)');
  await shot(page, `${label}-05-complete`);
  await page.getByTestId('complete-continue').click();

  // Lesson 2 with one wrong answer: spills a water pot, has a roleplay
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('chapter-start').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await playLesson(page, { wrongOnce: true, shotPrefix: `${label}-06` }), 'finished lesson c07-l2 with a mistake');
  ok((await page.getByTestId('done-cowries').innerText()).includes('+5'), 'lesson with a mistake gives 5 cowries');
  ok((await page.getByTestId('done-goal').count()) === 0, 'the goal is only celebrated once a day');
  await page.getByTestId('complete-continue').click();
  await page.getByTestId('back').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('tile-c07').getAttribute('aria-label')).includes('Completed'), 'chapter 2 shows completed');
  ok((await page.getByTestId('tile-c02').getAttribute('aria-label')).includes('Unlocked'), 'completing a chapter unlocks chapter 4');
  ok((await page.getByTestId('stat-hearts').getAttribute('aria-label')).includes('4 of 5'), 'one water pot was spilled');
  ok((await page.getByTestId('daily-goal-count').innerText()) === '1/1', 'home shows the daily goal reached');
  await page.getByTestId('daily-goal').click();
  await page.getByTestId('goal-3').click();
  ok((await page.getByTestId('daily-goal-count').innerText()) === '2/3', 'a bigger goal counts today\'s two lessons: 2 of 3');
  await shot(page, `${label}-07-home-progress`);

  // Practice Lab: a review fills the water pots
  await page.getByTestId('tab-practice').click();
  await page.getByTestId('screen-practice').waitFor();
  await shot(page, `${label}-08-practice`);
  await page.getByTestId('practice-review').click();
  ok(await playLesson(page), 'finished a review round');
  ok(await page.getByText('Your water pots are full again').isVisible(), 'review fills the water pots');
  await page.getByTestId('complete-continue').click();
  await page.getByTestId('convo-dlg-names').click();
  ok(await playLesson(page, { shotPrefix: `${label}-09` }), 'replayed a conversation');
  await page.getByTestId('complete-continue').click();

  // Reading stories: the first one opens after Introductions (chapter 2), the next stay locked.
  await page.getByTestId('screen-practice').waitFor();
  ok(await page.getByTestId('story-st-mpola').isDisabled(), 'stories for later chapters are locked');
  await page.getByTestId('story-st-nakato').click();
  await page.getByTestId('screen-story').waitFor();
  ok((await page.getByTestId('story-line-4').innerText()).includes('Erinnya lyange nze Sara'), 'the story puts the learner in it by name');
  ok((await page.getByTestId('story-tr-0').count()) === 0, 'translations are hidden at first');
  await page.getByTestId('story-line-0').click();
  ok((await page.getByTestId('story-tr-0').innerText()) === 'How are you?', 'tapping a line shows what it means');
  ok(await page.getByTestId('story-finish').isDisabled(), 'the story is finished by answering its questions');
  await page.getByTestId('story-q-0-option').first().click();
  for (let q = 0; q < 2; q++) await page.getByTestId(`story-q-${q}-answer`).click();
  await shot(page, `${label}-09b-story`);
  await page.getByTestId('story-finish').click();
  await page.getByTestId('story-done').waitFor();
  ok(true, 'a story read to the end earns cowries');
  await page.getByTestId('story-back').click();
  await page.getByTestId('screen-practice').waitFor();

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
  ok((await page.getByTestId('tile-gems').getAttribute('aria-label')).includes('21'), 'profile shows total cowries (10 + 5 + 2 + 2 + 2 for the story)');
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
  ok((await page.getByTestId('tile-c07').getAttribute('aria-label')).includes('Klar'), 'progress persists after reload');

  // Kids mode: a child's profile with its own progress, no water pots, and a grown-up check.
  const WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, noll: 0, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9 };
  const passGate = async (wrongFirst = false) => {
    await page.getByTestId('parent-gate').waitFor();
    if (wrongFirst) {
      await page.getByTestId('gate-answer').fill('1');
      await page.getByTestId('gate-submit').click();
    }
    const q = await page.getByTestId('gate-question').innerText();
    const [a, b] = q.toLowerCase().match(/[a-zåäö]+/g).map((w) => WORDS[w]).filter((n) => n !== undefined);
    await page.getByTestId('gate-answer').fill(String(a * b));
    await page.getByTestId('gate-submit').click();
  };
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-learners').click();
  await page.getByTestId('screen-learners').waitFor();
  await page.getByTestId('learner-add').click();
  await page.getByTestId('learner-name').fill('Nakato');
  await page.getByTestId('learner-save').click();
  await page.getByTestId('learner-Nakato').waitFor();
  ok(true, 'a parent adds a child\'s profile');
  await page.getByTestId('learner-Nakato').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('home-greeting').innerText()).includes('Nakato'), 'switching to the child greets them by name');
  ok((await page.getByTestId('tile-c07').getAttribute('aria-label')).includes('Redo'), 'the child starts with their own progress');
  ok((await page.getByTestId('stat-hearts').count()) === 0, 'a child\'s profile has no water pots');
  await shot(page, `${label}-12-kid-home`);
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-settings').click();
  await passGate(true);
  await page.getByTestId('screen-settings').waitFor();
  ok(true, 'settings in a child\'s profile need a grown-up (and a wrong answer doesn\'t pass)');
  await page.getByTestId('back').click();
  await page.getByTestId('open-learners').click();
  await page.getByTestId('learner-main').click();
  await passGate();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('home-greeting').innerText()).includes('Sara'), 'leaving the child\'s profile needs a grown-up, then the parent is back');
  ok((await page.getByTestId('tile-c07').getAttribute('aria-label')).includes('Klar'), 'and the parent\'s progress is as it was');

  // Reset erases progress and returns to onboarding
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('reset').click();
  await page.getByTestId('reset-confirm').click();
  ok(await page.getByTestId('screen-onboarding').waitFor({ timeout: 5000 }).then(() => true, () => false), 'reset returns to onboarding');

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  ok(cspViolations.length === 0, `the Content-Security-Policy blocks nothing${cspViolations.length ? `: ${[...new Set(cspViolations)].slice(0, 3).join(' | ')}` : ''}`);
  await browser.close();
}

/** Part 2 and the placement test, from a fresh start. */
async function placement() {
  console.log('\nplacement test and Part 2');
  const browser = await chromium.launch();
  const cspViolations = enforceCsp(browser, BASE, cspFromNetlify(ROOT));
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
  // Know all 12 chapters of Part 1, then miss Part 2's first chapter twice.
  for (let i = 0; i < 12; i++) {
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
  ok((await page.getByTestId('placement-message').innerText()).includes('12 chapters'), 'the result says 12 chapters are known');
  await shot(page, 'mobile-17-placement-result');
  await page.getByTestId('placement-skip').click();
  await page.getByTestId('screen-home').waitFor();
  ok((await page.getByTestId('tile-c11').getAttribute('aria-label')).includes('Completed'), 'known chapters are marked done');
  ok((await page.getByTestId('tile-c12').getAttribute('aria-label')).includes('Completed'), 'Part 1\'s final conversation counts as done');
  ok((await page.getByTestId('tile-c13').getAttribute('aria-label')).includes('Ready to start'), 'Part 2 is now open');
  ok((await page.getByTestId('placement-offer').count()) === 0, 'the offer is gone after the test');
  await page.getByTestId('unit-2').scrollIntoViewIfNeeded();
  await shot(page, 'mobile-18-part-2');

  // Certificates: skipping chapters with the test counts, but Part 1's final conversation must be played.
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('certificates-card').waitFor();
  ok((await page.getByTestId('cert-open-1').getAttribute('aria-label')).includes('Finish Part 1 to get it'), 'the certificate waits for the final conversation to be played');
  await page.getByTestId('cert-open-1').click();
  ok(await page.getByTestId('cert-not-yet').waitFor({ timeout: 5000 }).then(() => true, () => false), 'and its page says what is left to do');
  await page.goto(`${BASE}/chapter/c12`);
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('lesson-row-c12-l1').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await playLesson(page), 'played the first part of the final conversation');
  ok((await page.getByTestId('done-certificate').count()) === 0, 'no certificate yet halfway through');
  await page.getByTestId('complete-continue').click();
  await page.getByTestId('screen-chapter').waitFor();
  await page.getByTestId('lesson-row-c12-l2').click();
  await page.getByTestId('lesson-player').waitFor();
  ok(await playLesson(page), 'played the rest of the final conversation');
  ok(await page.getByTestId('done-certificate').waitFor({ timeout: 3000 }).then(() => true, () => false), 'finishing Part 1 offers the certificate');
  await shot(page, 'mobile-18b-part-done');
  await page.getByTestId('complete-certificate').click();
  await page.getByTestId('cert-card').waitFor();
  ok((await page.getByTestId('cert-name').inputValue()) === 'Kato', 'the certificate starts with the learner\'s name');
  await page.getByTestId('cert-name').fill('Kato Ssemakula');
  ok((await page.getByTestId('cert-card-name').innerText()) === 'Kato Ssemakula', 'the preview shows the name as it is typed');
  ok((await page.getByTestId('cert-card').getAttribute('aria-label')).includes('has completed Part 1 · Absolute Foundations'), 'it names the part');
  await shot(page, 'mobile-18c-certificate');
  await page.goto(BASE);
  await page.getByTestId('screen-home').waitFor();

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
  ok(cspViolations.length === 0, `the Content-Security-Policy blocks nothing${cspViolations.length ? `: ${[...new Set(cspViolations)].slice(0, 3).join(' | ')}` : ''}`);
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
