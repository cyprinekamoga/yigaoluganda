// After `expo export -p web`:
//  1. Paint the page maroon before the app loads (no white flash) and colour the browser chrome.
//     (public/index.html already does this; kept for exports made without that template.)
//  2. Write the service worker (sw.js) that makes the installed web app work offline: it keeps a
//     copy of every file of this version and serves the app from it when there is no connection.
//     Each deploy makes a new sw.js, which replaces the old copy the next time the app is opened.
// Usage: node scripts/postexport.mjs [output dir, default dist]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSW } from 'workbox-build';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.argv[2] ?? 'dist');

const file = path.join(DIST, 'index.html');
let html = readFileSync(file, 'utf8');
if (!html.includes('id="yiga-bg"')) {
  html = html.replace(
    '</head>',
    '<meta name="theme-color" content="#250104"><style id="yiga-bg">html,body{background:#250104;color-scheme:dark}</style></head>',
  );
  writeFileSync(file, html);
}
console.log('postexport: background and theme-color set');

const { count, size, warnings } = await generateSW({
  globDirectory: DIST,
  globPatterns: ['**/*.{js,css,html,json,webmanifest,png,jpg,svg,webp,ico,ttf,otf,woff,woff2,mp3,m4a,aac,wav}'],
  globIgnores: ['sw.js'],
  swDest: path.join(DIST, 'sw.js'),
  // The app's JavaScript is one large file; keep it.
  maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
  // Bundles and assets have content hashes in their names, so the name alone tells versions apart.
  dontCacheBustURLsMatching: /\/(_expo\/static|assets)\//,
  // Every page of the app is the same single page.
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//, /^\/sw\.js$/, /\/[^/?]+\.[^/]+$/],
  runtimeCaching: [
    {
      // The local price: fresh when online, the last one seen when offline.
      urlPattern: ({ url }) => url.pathname === '/api/price',
      handler: 'NetworkFirst',
      options: { cacheName: 'yiga-price', networkTimeoutSeconds: 4, expiration: { maxEntries: 2 } },
    },
  ],
  // A new version takes over as soon as it is installed; old copies are removed.
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  inlineWorkboxRuntime: true,
  sourcemap: false,
  mode: 'production',
});
for (const w of warnings) console.warn(`postexport: ${w}`);
console.log(`postexport: service worker keeps ${count} files (${(size / 1024 / 1024).toFixed(1)} MB) for offline use`);
