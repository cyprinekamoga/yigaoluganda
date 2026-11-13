// Copies what the separately deployed sites need from the app, so each site can be deployed
// from its own folder:
//   - the price table (src/pricing/pricing.ts) → the app's and the landing page's edge functions,
//     plus a plain-JavaScript copy for the landing page's build
//   - course facts (chapters, counts, fun facts) → landing/src/course.json
// Usage: npm run sites:sync
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));

const source = path.join(ROOT, 'src/pricing/pricing.ts');
for (const target of ['netlify/lib/pricing.ts', 'landing/netlify/lib/pricing.ts']) {
  copyFileSync(source, path.join(ROOT, target));
  console.log(`copied pricing → ${target}`);
}
// A plain-JavaScript copy for the landing page's build script, so it runs on any Node version.
const js = stripTypeScriptTypes(readFileSync(source, 'utf8'));
writeFileSync(path.join(ROOT, 'landing/src/pricing.mjs'), `// Generated from src/pricing/pricing.ts by npm run sites:sync. Do not edit.\n${js}`);
console.log('wrote landing/src/pricing.mjs');

const PARTS = [
  { dir: 'unit-1', n: 1, title: { en: 'Absolute Foundations', sv: 'Grunderna' } },
  { dir: 'unit-2', n: 2, title: { en: 'Everyday Life', sv: 'Vardagen' } },
];
const parts = PARTS.map((p) => ({
  ...p,
  chapters: read(`content/${p.dir}/chapters.json`),
  phrases: read(`content/${p.dir}/phrases.json`),
  dialogues: read(`content/${p.dir}/dialogues.json`),
  tips: read(`content/${p.dir}/tips.json`),
}));
const facts = read('content/facts.json');
const sum = (f) => parts.reduce((n, p) => n + f(p), 0);
const course = {
  counts: {
    parts: parts.length,
    chapters: sum((p) => p.chapters.length),
    lessons: sum((p) => p.chapters.reduce((n, c) => n + c.lessons.length, 0)),
    phrases: sum((p) => p.phrases.length),
    conversations: sum((p) => p.dialogues.length),
    tips: sum((p) => p.tips.length),
  },
  parts: parts.map((p) => ({
    n: p.n,
    title: p.title,
    chapters: p.chapters.map((c) => ({ n: c.n, id: c.id, lg: c.lgTitle, title: c.title, scenario: c.scenario })),
  })),
  facts: facts.map((f) => ({ id: f.id, text: f.text })),
};
writeFileSync(path.join(ROOT, 'landing/src/course.json'), JSON.stringify(course, null, 2) + '\n');
console.log(`wrote landing/src/course.json (${course.counts.parts} parts, ${course.counts.chapters} chapters, ${course.counts.phrases} phrases)`);
