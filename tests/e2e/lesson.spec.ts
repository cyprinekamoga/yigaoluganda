import { expect, test } from '@playwright/test'
import { answerExercise, freshStart, onboard, playToEnd, type Lang } from './helpers'

const combos: { ui: Lang; track: Lang }[] = [
  { ui: 'sv', track: 'sv' },
  { ui: 'sv', track: 'en' },
  { ui: 'en', track: 'en' },
  { ui: 'en', track: 'sv' },
]

const instruction = { sv: 'Tryck på rätt bild', en: 'Tap the right picture' }
const meaningOfEnsawo = { sv: 'väska', en: 'bag' }

for (const { ui, track } of combos) {
  test(`completes a whole lesson: UI ${ui}, track ${track} → Luganda`, async ({ page }) => {
    await freshStart(page)
    await onboard(page, ui, track)
    await expect(page.locator('html')).toHaveAttribute('lang', ui)

    await page.getByTestId('lesson-u01-l1').click()
    // Instructions follow the UI language; meanings follow the track.
    await expect(page.getByRole('heading', { name: instruction[ui] })).toBeVisible()
    await expect(page.getByTestId('exercise')).toContainText(meaningOfEnsawo[track])

    await playToEnd(page)
    await expect(page.getByTestId('xp-earned')).toContainText('XP')
    await page.getByTestId('finish').click()

    // Next lesson unlocked, progress saved after reload.
    await expect(page.getByTestId('lesson-u01-l2')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('lesson-u01-l2')).toBeVisible()
    expect(Number(await page.getByTestId('xp-value').innerText())).toBeGreaterThan(0)
  })
}

test('a wrong answer is corrected gently, costs nothing and comes back later', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'en', 'en')
  await page.getByTestId('lesson-u01-l1').click()
  await answerExercise(page, false)
  await expect(page.getByTestId('lesson-hearts')).toHaveCount(0)
  await playToEnd(page)
  await expect(page.getByTestId('complete')).toContainText('1 to practise again')
})

test('typed answers accept capitals, spaces and accents', async ({ page }) => {
  await freshStart(page)
  await onboard(page, 'en', 'en')
  // Unlock the third lesson, which includes a typing task.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('yiga-oluganda:v1')!)
    s.completedLessons = { 'u01-l1': { at: 1, perfect: true }, 'u01-l2': { at: 1, perfect: true } }
    localStorage.setItem('yiga-oluganda:v1', JSON.stringify(s))
  })
  await page.reload()
  await page.getByTestId('lesson-u01-l3').click()
  for (let i = 0; i < 30; i++) {
    const kind = await page.getByTestId('exercise').getAttribute('data-kind')
    if (kind === 'type') break
    await answerExercise(page)
  }
  const input = page.getByTestId('type-input')
  const answer = (await input.getAttribute('data-answer'))!
  await input.fill(`  ${answer.toUpperCase().replace('A', 'Á')}  `)
  await page.getByTestId('check').click()
  await expect(page.getByTestId('feedback-correct')).toBeVisible()
})
