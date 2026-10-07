#!/usr/bin/env node
// Builds the paid website: the landing/login pages from site/ at the root and the app
// (with login required) under /app/. Output: site-dist/ (what Netlify publishes).
import { execSync } from 'node:child_process'
import { cpSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'site-dist')
rmSync(out, { recursive: true, force: true })
execSync('node scripts/build-content.mjs && npx tsc -b && npx vite build --base=/app/ --outDir site-dist/app', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_REQUIRE_LOGIN: 'true' },
})
cpSync(join(root, 'site'), out, { recursive: true })
console.log('Website built in site-dist/')
