import { expect, type Page } from '@playwright/test'

export type Lang = 'sv' | 'en'

/** Opens the app in test mode (answer buttons carry data-correct) with an empty device. */
export async function freshStart(page: Page) {
  await page.goto('./?e2e#/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./?e2e#/')
}

export async function onboard(page: Page, ui: Lang, mascot = 'Ngaali') {
  await page.getByTestId(`ui-${ui}`).click()
  await page.getByTestId('mascot-name').fill(mascot)
  await page.getByTestId('start').click()
  await expect(page.getByTestId('lesson-u01-l1')).toBeVisible()
}

/** Answers the current exercise. `correct: false` picks a wrong answer where possible. */
export async function answerExercise(page: Page, correct = true) {
  const ex = page.getByTestId('exercise')
  const kind = await ex.getAttribute('data-kind')
  if (kind === 'pairs') {
    const left = ex.getByTestId('pair-lg')
    const n = await left.count()
    for (let i = 0; i < n; i++) {
      const id = await left.nth(i).getAttribute('data-pair')
      await ex.locator(`[data-testid="pair-lg"][data-pair="${id}"]`).click()
      await ex.locator(`[data-testid="pair-meaning"][data-pair="${id}"]`).click()
    }
  } else if (kind === 'build') {
    const tiles = ex.getByTestId('tile')
    const orders = await tiles.evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-order'))))
    const sequence = orders.map((o, i) => [o, i] as const).filter(([o]) => o >= 0).sort((a, b) => a[0] - b[0]).map(([, i]) => i)
    if (!correct) sequence.reverse()
    for (const i of sequence) await tiles.nth(i).click()
    await page.getByTestId('check').click()
  } else if (kind === 'type') {
    const input = ex.getByTestId('type-input')
    const answer = (await input.getAttribute('data-answer')) ?? ''
    await input.fill(correct ? answer.toUpperCase() + '  ' : 'xyz')
    await page.getByTestId('check').click()
  } else {
    await ex.locator(`[data-testid="choice"][data-correct="${correct}"]`).first().click()
    await page.getByTestId('check').click()
  }
  await expect(page.getByTestId(correct || kind === 'pairs' ? 'feedback-correct' : 'feedback-wrong')).toBeVisible()
  await page.getByTestId('continue').click()
}

/** Plays through the whole lesson until the "complete" screen. */
export async function playToEnd(page: Page, opts: { mistakeAt?: number } = {}) {
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('complete').isVisible()) return
    await expect(page.getByTestId('exercise').or(page.getByTestId('complete'))).toBeVisible()
    if (await page.getByTestId('complete').isVisible()) return
    await answerExercise(page, opts.mistakeAt !== i)
  }
  throw new Error('Lesson did not finish')
}
