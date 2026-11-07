// Renders the app icons from an SVG of Ngaali's head (same geometry as src/ui/Ngaali.tsx).
// Uses the pre-installed Playwright Chromium. Run: npm run icons
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

function head(mono = false, bleed = true) {
  const neck = bleed
    ? 'M50.5 60 C49.5 80 46 100 43 140 L77 140 C74 100 70.5 80 69.5 60 Z'
    : 'M50.5 60 C49.5 72 48 80 47 84 Q60 90 73 84 C72 80 70.5 72 69.5 60 Z';
  const c = (color) => (mono ? '#fff' : color);
  const bristles = [-64, -48, -32, -16, 0, 16, 32, 48, 64]
    .map((deg, i) => {
      const len = 15 + (i % 2) * 4.5;
      const rad = ((deg - 90) * Math.PI) / 180;
      const x = 60 + Math.cos(rad) * len;
      const y = 34 + Math.sin(rad) * len;
      return `<line x1="60" y1="34" x2="${x}" y2="${y}" stroke="${c('#F5B400')}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2.4" fill="${c('#D98E00')}"/>`;
    })
    .join('');
  if (mono) {
    // A single-colour silhouette for Android themed icons.
    return `${bristles}<path d="${neck}" fill="#fff" opacity="0.55"/><circle cx="60" cy="51" r="20.5" fill="#fff"/><path d="M56 59.5 L64 59.5 L60 69 Z" fill="#fff"/><ellipse cx="60" cy="73.5" rx="3.1" ry="4.6" fill="#fff"/>`;
  }
  return `${bristles}
    <path d="${neck}" fill="#A7B1BE"/>
    <circle cx="60" cy="51" r="20.5" fill="#A7B1BE"/>
    <path d="M40.6 48 A20 20 0 0 1 79.4 48 Q60 40 40.6 48 Z" fill="#1F1A17"/>
    <ellipse cx="49" cy="55" rx="9" ry="10" fill="#fff"/><ellipse cx="71" cy="55" rx="9" ry="10" fill="#fff"/>
    <ellipse cx="49" cy="46.2" rx="5.6" ry="2.5" fill="#D71A06"/><ellipse cx="71" cy="46.2" rx="5.6" ry="2.5" fill="#D71A06"/>
    <path d="M45.5 55 Q50 49 54.5 55 M65.5 55 Q70 49 74.5 55" stroke="#1F1A17" stroke-width="2.8" stroke-linecap="round" fill="none"/>
    <ellipse cx="44.5" cy="62" rx="3" ry="1.6" fill="#F6A9B3"/><ellipse cx="75.5" cy="62" rx="3" ry="1.6" fill="#F6A9B3"/>
    <path d="M56 59.5 L64 59.5 L60 69 Z" fill="#3D4049"/>
    <ellipse cx="60" cy="73.5" rx="3.1" ry="4.6" fill="#D71A06"/>`;
}

/** viewBox crop around the head (x 30–90, y 12–88), scaled to `fill` of the canvas. */
function svg({ size, bg = null, fill = 0.8, mono = false, bleed = true }) {
  const box = 78;
  const pad = (box / fill - box) / 2;
  const vb = `${30 - pad} ${11 - pad} ${box + pad * 2} ${box + pad * 2}`;
  const rect = bg ? `<rect x="-100" y="-100" width="400" height="400" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}">${rect}${head(mono, bleed)}</svg>`;
}

const BG = '#250104'; // deep maroon
const jobs = [
  ['icon.png', svg({ size: 1024, bg: BG, fill: 0.78 })],
  ['android-icon-foreground.png', svg({ size: 1024, fill: 0.56 })],
  ['android-icon-background.png', `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`],
  ['android-icon-monochrome.png', svg({ size: 1024, fill: 0.56, mono: true })],
  ['splash-icon.png', svg({ size: 512, fill: 0.9, bleed: false })],
  ['favicon.png', svg({ size: 64, bg: BG, fill: 0.9 })],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, markup] of jobs) {
  const size = Number(markup.match(/width="(\d+)"/)[1]);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await page.screenshot({ path: path.join(ASSETS, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', name);
}
writeFileSync(path.join(ASSETS, 'icon.svg'), svg({ size: 1024, bg: BG, fill: 0.78 }));
await browser.close();
