// Renders public/icon.svg to the PNG icons the PWA manifest needs. Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`)
  await page.screenshot({ path: new URL(`../public/icon-${size}.png`, import.meta.url).pathname, omitBackground: true })
  await page.close()
}
await browser.close()
console.log('icons written')
