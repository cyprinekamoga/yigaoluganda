// After `expo export -p web`: paint the page maroon before the app loads (no white flash)
// and colour the browser chrome to match.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.html');
let html = readFileSync(file, 'utf8');
if (!html.includes('id="yiga-bg"')) {
  html = html.replace(
    '</head>',
    '<meta name="theme-color" content="#250104"><style id="yiga-bg">html,body{background:#250104;color-scheme:dark}</style></head>',
  );
  writeFileSync(file, html);
}
console.log('postexport: background and theme-color set');
