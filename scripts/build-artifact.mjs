#!/usr/bin/env node
// Builds a single, self-contained HTML file of the app (for sharing a preview link).
// Usage: node scripts/build-artifact.mjs [output.html]
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] ?? join(root, 'dist-artifact/yiga-oluganda.html')
execSync('node scripts/build-content.mjs && npx vite build --mode artifact', { cwd: root, stdio: 'inherit' })

const dist = join(root, 'dist-artifact')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const cssHref = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"/)?.[1]
const jsSrc = html.match(/<script type="module"[^>]*src="\.\/([^"]+\.js)"/)?.[1]
if (!cssHref || !jsSrc) throw new Error('Could not find the built CSS/JS in dist-artifact/index.html')
const css = readFileSync(join(dist, cssHref), 'utf8')
const js = readFileSync(join(dist, jsSrc), 'utf8').replace(/<\/script/gi, '<\\/script')
if (/url\((?!data:|["']?data:|#)/.test(css)) console.warn('Warning: the CSS still references external files')

const page = `<title>Yiga Oluganda</title>
<meta name="description" content="Learn basic Luganda with Ngaali the crane. Preview build of Yiga Oluganda.">
<style>${css}</style>
<div id="root"></div>
<noscript>Yiga Oluganda needs JavaScript. / Yiga Oluganda behöver JavaScript.</noscript>
<script type="module">${js}</script>
`
writeFileSync(out, page)
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`)
