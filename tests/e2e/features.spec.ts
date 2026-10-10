import { expect, test } from '@playwright/test'
import { answerExercise, freshStart, onboard, playToEnd } from './helpers'

const KEY = 'yiga-oluganda:v1'

async function patchState(page: import('@playwright/test').Page, patch: (s: any) => void) {
  await page.evaluate(
    ([key, fn]) => {
      const s = JSON.parse(localStorage.getItem(key as string)!)
      new Function('s', fn as string)(s)
      localStorage.setItem(key as string, JSON.stringify(s))
    },
    [KEY, `(${patch.toString()})(s)`],
  )
  await page.reload()
}

test('story mode: scenes, tappable words, translations and questions', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'sv', 'sv')
  await patchState(page, (s) => {
    for (const id of ['u01-l1', 'u01-l2', 'u01-l3', 'u01-l4', 'u01-l5', 'u02-l1', 'u02-l2', 'u02-l3', 'u02-l4', 'u02-l5'])
      s.completedLessons[id] = { at: 1, perfect: false }
  })
  await page.getByRole('link', { name: 'Berättelser' }).click()
  await page.locator('a[href="#/story/ch02"]').click()
  await expect(page.getByTestId('narration')).toContainText('ennyonyi')
  await page.getByRole('button', { name: 'ennyonyi' }).click()
  await expect(page.getByTestId('narration')).toContainText('= flygplan')
  for (let i = 0; i < 3; i++) await page.getByTestId('story-next').click()
  await page.getByTestId('toggle-translation').first().click()
  await expect(page.getByTestId('line-translation').first()).toHaveText('Välkommen, Alex!')
  await page.getByTestId('story-questions').click()
  await playToEnd(page)
  await page.getByTestId('finish').click()
  await expect(page.getByText('Läst')).toBeVisible()
})

test('practice brings back weak words, and mistakes never block a lesson', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'en', 'en')
  await page.getByTestId('lesson-u01-l1').click()
  for (let i = 0; i < 6; i++) await answerExercise(page, false)
  await playToEnd(page)
  await page.getByTestId('finish').click()
  await page.getByRole('link', { name: 'Practice' }).click()
  await page.getByTestId('start-practice').click()
  await playToEnd(page)
  await expect(page.getByTestId('complete')).toBeVisible()
  await page.getByTestId('finish').click()
  expect(Number(await page.getByTestId('xp-value').innerText())).toBeGreaterThan(0)
})

test('badges page shows earned badges', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'en', 'en')
  await page.getByTestId('lesson-u01-l1').click()
  await playToEnd(page)
  await page.getByTestId('finish').click()
  await page.getByRole('link', { name: 'Badges' }).click()
  await expect(page.getByTestId('badge-firstLesson')).toHaveAttribute('data-earned', 'true')
  await expect(page.getByTestId('badge-streak7')).toHaveAttribute('data-earned', 'false')
})

test('settings switch the interface language and the track', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'en', 'en')
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByTestId('ui-sv').click()
  await expect(page.getByRole('heading', { name: 'Inställningar' })).toBeVisible()
  await page.getByTestId('track-sv').click()
  await page.getByRole('link', { name: 'Lär dig' }).click()
  await page.getByTestId('lesson-u01-l1').click()
  await expect(page.getByTestId('exercise')).toContainText('väska')
})

test('parent page is behind a question and can erase progress', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'en', 'en')
  await page.getByTestId('lesson-u01-l1').click()
  await playToEnd(page)
  await page.getByTestId('finish').click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByTestId('parent-link').click()

  await page.getByTestId('gate-input').fill('1')
  await page.getByTestId('gate-submit').click()
  await expect(page.getByRole('alert')).toBeVisible()
  const q = page.getByTestId('gate-question')
  const a = Number(await q.getAttribute('data-a'))
  const b = Number(await q.getAttribute('data-b'))
  await page.getByTestId('gate-input').fill(String(a * b))
  await page.getByTestId('gate-submit').click()

  await expect(page.getByTestId('parent-page')).toContainText('Lessons finished')
  await page.getByTestId('reset').click()
  await page.getByTestId('reset-yes').click()
  await expect(page.getByText('All progress is erased.')).toBeVisible()
  await page.goto('./?e2e#/')
  await expect(page.getByTestId('ui-sv')).toBeVisible()
})

test('works offline after the first visit (PWA)', async ({ page, context }) => {
  await freshStart(page)
  await onboard(page, 'sv', 'sv')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('lesson-u01-l1')).toBeVisible()
  await page.getByTestId('lesson-u01-l1').click()
  await expect(page.getByTestId('exercise')).toBeVisible()
  await context.setOffline(false)
})
