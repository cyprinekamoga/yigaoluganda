// Renders the icons for the installable web app (public/icons) from the app icons in assets/.
// "any" icons are the normal app icon; the "maskable" one puts Ngaali inside the safe zone
// (Android crops it to a circle or squircle). Uses the pre-installed Playwright Chromium.
// Run: node scripts/make-pwa-icons.mjs
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const dataUrl = (file) => `data:image/png;base64,${readFileSync(path.join(ROOT, 'assets', file)).toString('base64')}`;
const icon = dataUrl('icon.png');
const fg = dataUrl('android-icon-foreground.png');

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(name, size, layers, scale = 1) {
  const png = await page.evaluate(
    async ({ size, layers, scale }) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#250104';
      ctx.fillRect(0, 0, size, size);
      for (const src of layers) {
        const img = new Image();
        img.src = src;
        await img.decode();
        const s = size * scale;
        ctx.drawImage(img, (size - s) / 2, (size - s) / 2, s, s);
      }
      return canvas.toDataURL('image/png').split(',')[1];
    },
    { size, layers, scale },
  );
  writeFileSync(path.join(OUT, name), Buffer.from(png, 'base64'));
  console.log(`  ${name} (${size}×${size})`);
}

await render('icon-192.png', 192, [icon]);
await render('icon-512.png', 512, [icon]);
// The adaptive-icon foreground already keeps Ngaali inside Android's 66% safe zone.
await render('maskable-512.png', 512, [fg]);
await render('apple-touch-icon.png', 180, [icon]);
await browser.close();
