/**
 * Automated tests open the app with `?e2e` in the address. Answer buttons then carry
 * data attributes that tell the test which one is right. Nothing else changes.
 */
export const E2E = typeof location !== 'undefined' && new URLSearchParams(location.search).has('e2e')

export function e2eAttr(correct: boolean): { 'data-correct'?: string } {
  return E2E ? { 'data-correct': String(correct) } : {}
}
