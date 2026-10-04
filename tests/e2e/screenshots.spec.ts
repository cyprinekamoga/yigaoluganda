import { test } from '@playwright/test'
import { answerExercise, freshStart, onboard, playToEnd } from './helpers'

// Takes screenshots of the main screens for a visual design check.
test('screenshots of main screens', async ({ page }, info) => {
  const shot = (name: string) => page.screenshot({ path: `screenshots/${info.project.name}-${name}.png`, fullPage: false })
  await freshStart(page)
  await shot('01-onboarding')
  await page.getByTestId('ui-sv').click()
  await shot('02-track')
  await page.getByTestId('track-sv').click()
  await shot('03-name')
  await page.getByTestId('start').click()
  await page.waitForTimeout(300)
  await shot('04-path')
  await page.getByTestId('lesson-u01-l1').click()
  await page.waitForTimeout(300)
  await shot('05-exercise-picture')
  await page.locator('[data-testid="choice"][data-correct="true"]').first().click()
  await shot('06-selected')
  await page.getByTestId('check').click()
  await page.waitForTimeout(400)
  await shot('07-feedback-correct')
  await page.getByTestId('continue').click()
  await page.locator('[data-testid="choice"][data-correct="false"]').first().click()
  await page.getByTestId('check').click()
  await page.waitForTimeout(400)
  await shot('08-feedback-gentle')
  await page.getByTestId('continue').click()
  for (let i = 0; i < 4; i++) {
    const kind = await page.getByTestId('exercise').getAttribute('data-kind')
    if (kind === 'pairs') {
      await shot('09-pairs')
    }
    await answerExercise(page)
  }
  await playToEnd(page)
  await page.waitForTimeout(500)
  await shot('10-complete')
})

test('screenshots of story, practice, badges, settings and parent page', async ({ page }, info) => {
  const shot = (name: string) => page.screenshot({ path: `screenshots/${info.project.name}-${name}.png` })
  await freshStart(page)
  await onboard(page, 'en', 'en')
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('yiga-oluganda:v1')!)
    for (const id of ['u01-l1', 'u01-l2', 'u01-l3', 'u01-l4', 'u01-l5', 'u02-l1', 'u02-l2', 'u02-l3', 'u02-l4', 'u02-l5', 'u03-l1', 'u03-l2', 'u03-l3', 'u04-l1', 'u04-l2', 'u05-l1', 'u05-l2', 'u05-l3'])
      s.completedLessons[id] = { at: 1, perfect: true }
    s.xp = 240; s.streak = 3; s.bestStreak = 3; s.lastActiveDay = null
    s.memory = { amazzi: { box: 1, due: 0, correct: 2, wrong: 2, lastSeen: 0 }, ennyonyi: { box: 1, due: 0, correct: 1, wrong: 1, lastSeen: 0 }, ente: { box: 2, due: 0, correct: 3, wrong: 0, lastSeen: 0 }, 'oli-otya': { box: 1, due: 0, correct: 1, wrong: 1, lastSeen: 0 } }
    s.badges = { firstLesson: 1, packed: 1, landed: 1, fiveLessons: 1, perfect: 1, counter: 1, respect: 1, xp100: 1 }
    localStorage.setItem('yiga-oluganda:v1', JSON.stringify(s))
  })
  await page.reload()
  await page.waitForTimeout(300)
  await shot('11-path-progress')
  await page.goto('./?e2e#/story/ch04')
  await page.getByRole('button', { name: 'ennyumba' }).click()
  await shot('12-story-scene')
  await page.getByTestId('story-next').click()
  await page.getByTestId('story-next').click()
  await page.getByTestId('toggle-translation').first().click()
  await shot('13-story-dialogue')
  await page.goto('./?e2e#/story/ch03')
  await page.getByTestId('story-next').click()
  await page.getByTestId('story-next').click()
  await shot('14-story-road')
  await page.goto('./?e2e#/practice')
  await shot('15-practice')
  await page.getByTestId('start-practice').click()
  for (let i = 0; i < 6; i++) {
    const kind = await page.getByTestId('exercise').getAttribute('data-kind')
    if (kind === 'build') { await shot('16-build'); break }
    await answerExercise(page)
  }
  await page.goto('./?e2e#/badges')
  await shot('17-badges')
  await page.goto('./?e2e#/settings')
  await shot('18-settings')
  await page.getByTestId('parent-link').click()
  await shot('19-parent-gate')
  const q = page.getByTestId('gate-question')
  await page.getByTestId('gate-input').fill(String(Number(await q.getAttribute('data-a')) * Number(await q.getAttribute('data-b'))))
  await page.getByTestId('gate-submit').click()
  await shot('20-parent')
  await page.goto('./?e2e#/lesson/u05-l3')
  for (let i = 0; i < 20; i++) {
    const kind = await page.getByTestId('exercise').getAttribute('data-kind')
    if (kind === 'fill') { await shot('21-fill'); break }
    await answerExercise(page)
  }
})
