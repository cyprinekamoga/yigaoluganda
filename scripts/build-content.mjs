#!/usr/bin/env node
// Checks the content files, then writes:
//   src/generated/audio-manifest.json  - word ids that have a recording in public/audio/
//   AUDIO_TODO.md                      - every word and phrase that still needs a recording
// Runs automatically before `npm run dev`, `npm run build` and `npm test`.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const CATEGORIES = new Set([
  'greetings', 'phrases', 'family', 'people', 'numbers', 'food', 'body', 'animals', 'home',
  'school', 'verbs', 'travel', 'transport', 'nature', 'market', 'culture', 'time', 'months', 'weather',
])

/** Returns a list of human-readable problems. An empty list means the content is OK. */
export function validateContent({ vocabulary, units, story }) {
  const errors = []
  const ids = new Set()
  for (const w of vocabulary) {
    const where = `vocabulary "${w.id}"`
    if (!w.id || !/^[a-z0-9-]+$/.test(w.id)) errors.push(`${where}: id must be lower-case letters, digits and dashes`)
    if (ids.has(w.id)) errors.push(`${where}: duplicate id`)
    ids.add(w.id)
    for (const f of ['lg', 'en', 'sv']) if (!w[f] || typeof w[f] !== 'string') errors.push(`${where}: missing "${f}"`)
    if (!CATEGORIES.has(w.category)) errors.push(`${where}: unknown category "${w.category}"`)
    if (!Number.isInteger(w.page) || w.page < 1) errors.push(`${where}: "page" must be a page number`)
    if (![1, 2, 3].includes(w.difficulty)) errors.push(`${where}: "difficulty" must be 1, 2 or 3`)
    if (w.image && /^(count|clock):/.test(w.image) && !/^(count|clock):\d+$/.test(w.image)) errors.push(`${where}: bad image "${w.image}"`)
  }

  const lessonIds = new Set()
  const unitIds = new Set()
  const checkQuestion = (q, where) => {
    if (!q.prompt?.en || !q.prompt?.sv) errors.push(`${where}: question needs prompt.en and prompt.sv`)
    if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${where}: question needs at least 2 options`)
    for (const o of q.options ?? []) if (!o.lg && !(o.en && o.sv)) errors.push(`${where}: option needs "lg" or both "en" and "sv"`)
  }
  for (const u of units) {
    if (unitIds.has(u.id)) errors.push(`unit "${u.id}": duplicate id`)
    unitIds.add(u.id)
    if (!u.title?.en || !u.title?.sv) errors.push(`unit "${u.id}": needs title.en and title.sv`)
    if (!u.lessons?.length) errors.push(`unit "${u.id}": has no lessons`)
    for (const l of u.lessons ?? []) {
      const where = `lesson "${l.id}"`
      if (lessonIds.has(l.id)) errors.push(`${where}: duplicate id`)
      lessonIds.add(l.id)
      if (!l.words?.length) errors.push(`${where}: has no words`)
      for (const w of l.words ?? []) if (!ids.has(w)) errors.push(`${where}: unknown word "${w}"`)
      for (const f of l.fillIns ?? []) {
        if (!f.text?.en?.includes('___') || !f.text?.sv?.includes('___')) errors.push(`${where}: fill-in text needs "___" in en and sv`)
        if (!ids.has(f.answer)) errors.push(`${where}: fill-in answer "${f.answer}" is not a word id`)
        for (const o of f.options ?? []) if (!ids.has(o)) errors.push(`${where}: fill-in option "${o}" is not a word id`)
        if (f.options && !f.options.includes(f.answer)) errors.push(`${where}: fill-in options must include the answer`)
      }
      for (const q of l.questions ?? []) checkQuestion(q, where)
    }
    if (u.story && !story.chapters.some((c) => c.id === u.story)) errors.push(`unit "${u.id}": unknown story "${u.story}"`)
  }

  for (const c of story.chapters) {
    const where = `story "${c.id}"`
    if (!unitIds.has(c.unit)) errors.push(`${where}: unknown unit "${c.unit}"`)
    for (const s of c.scenes) {
      for (const lang of ['en', 'sv']) {
        for (const m of s.text?.[lang]?.matchAll(/\{([^}]+)\}/g) ?? []) {
          if (!ids.has(m[1])) errors.push(`${where}: unknown word "{${m[1]}}" in ${lang} text`)
        }
      }
      for (const line of s.lines ?? []) {
        if (!story.speakers[line.speaker]) errors.push(`${where}: unknown speaker "${line.speaker}"`)
        if (!line.lg || !line.en || !line.sv) errors.push(`${where}: each line needs lg, en and sv`)
      }
    }
    for (const q of c.questions ?? []) checkQuestion(q, where)
  }
  return errors
}

function main() {
  const vocabulary = readJson('content/vocabulary.json')
  const units = readJson('content/units.json')
  const story = readJson('content/story.json')

  const errors = validateContent({ vocabulary, units, story })
  if (errors.length) {
    console.error(`\nContent has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}\n`)
    process.exit(1)
  }

  const audioDir = join(root, 'public/audio')
  const files = existsSync(audioDir) ? readdirSync(audioDir).filter((f) => f.endsWith('.mp3')) : []
  const recorded = new Set(files.map((f) => f.replace(/\.mp3$/, '')))
  const ids = new Set(vocabulary.map((w) => w.id))
  const unknown = [...recorded].filter((id) => !ids.has(id))
  if (unknown.length) console.warn(`Audio files with no matching word id (ignored): ${unknown.join(', ')}`)

  mkdirSync(join(root, 'src/generated'), { recursive: true })
  const manifest = [...recorded].filter((id) => ids.has(id)).sort()
  writeFileSync(join(root, 'src/generated/audio-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  const missing = vocabulary.filter((w) => !recorded.has(w.id))
  const unitOf = new Map()
  for (const u of units) for (const l of u.lessons) for (const w of l.words) if (!unitOf.has(w)) unitOf.set(w, `${u.id} ${u.title.en}`)
  const lines = [
    '# Audio to record',
    '',
    'This file is generated by `npm run content`. Do not edit it by hand.',
    '',
    'Each word and phrase needs a clear recording by a **native Luganda speaker**. Save it as',
    '`public/audio/<file name>` (mp3, mono, about 1–2 seconds, no music). The speaker icon',
    'appears in the app automatically once the file exists. The app does not use text-to-speech for Luganda.',
    '',
    `**${manifest.length} of ${vocabulary.length} recorded. ${missing.length} still needed.**`,
    '',
    '| File name | Luganda | English | Svenska | Unit | Book page |',
    '|---|---|---|---|---|---|',
    ...missing.map((w) => `| \`${w.id}.mp3\` | ${w.lg} | ${w.en} | ${w.sv} | ${unitOf.get(w.id) ?? ''} | ${w.page} |`),
    '',
  ]
  writeFileSync(join(root, 'AUDIO_TODO.md'), lines.join('\n'))
  console.log(`Content OK: ${vocabulary.length} words, ${units.length} units, ${story.chapters.length} story chapters, ${manifest.length} recordings.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
