# Plan: Yiga Oluganda

**Yiga Oluganda** ("Learn Luganda") is a free, offline-first web app that teaches basic Luganda to children aged 6–12 growing up in the diaspora. The mascot is an original grey crowned crane (Uganda's national bird). Its default name is **Ngaali**, the Luganda word for the crowned crane (book p46, clan 27). The child can rename it during onboarding.

## 0. Source book
The book **"Luganda för beginners"** (Cyprine Kamoga, 48 pages) was provided as a PDF after this plan was first drafted. It was read in full, both as extracted text and page by page as images, using the `pdf-reading` skill approach (pdftotext + page rendering).
- The book is a **story**: Alex, 10, travels from Sweden to Buganda in **10 chapters**. Each chapter has a word list and a worksheet. Extra worksheets cover numbers, the alphabet, the clock, farm animals, months, weather, everyday phrases, the body, food and clans.
- **Units follow the book's page order exactly** (18 units, 45 lessons). Each story chapter becomes a Story mode chapter that unlocks after its unit.
- The book's own worksheet items (fill-in sentences and "kryssa för rätt svar" questions) are stored in `units.json` and used as exercises.
- The book is Swedish-first, so English glosses were added and are reported in `content/CONTENT_REPORT.md`.

## 1. Skills and where they're used
Skills available in this environment were checked first. These are the relevant ones and how they were used:

| Step | Skill / tool |
|---|---|
| Reading the book | `pdf-reading` skill approach: inventory (`pdfinfo`/`pdffonts`), `pdftotext -layout` for the text layer, then every page read as an image to catch picture-only worksheets and patched answers |
| Visual design direction, tokens, mascot | `frontend-design` skill (token plan, self-critique from screenshots, avoiding templated defaults) |
| Running the app and taking screenshots | Playwright with the pre-installed Chromium (`tests/e2e/screenshots.spec.ts`). Every main screen was screenshotted on mobile and desktop and reviewed by eye |
| Web app testing | Playwright end-to-end tests (`tests/e2e/`) + Vitest unit tests |
| Accessibility checks | WCAG AA contrast test over the palette (`scripts/contrast.test.ts`), keyboard and screen-reader labels checked in code |
| Final review of the code | `code-review` skill |
| Research | WebSearch (many reference sites were blocked by the network proxy, see RESEARCH.md) |

Skills not used, and why: `docx`/`pptx`/`xlsx` (no Office files needed), `artifact-*` (the deliverable is a repo, not a hosted page), `dataviz` (the parent page only needs simple progress bars).

## 2. Design tokens (frontend-design pass)
Subject: a kids' language app rooted in Uganda and lived in Sweden. The distinctive element is **Ngaali the crane** and a path that winds like a river (the Nile starts in Uganda).

| Token | Hex | Use |
|---|---|---|
| `sun` | `#FFC72C` | Ugandan-flag yellow: highlights, XP, crane crown. Never used for text |
| `ink` | `#1E1B18` | Ugandan-flag black: text |
| `crane` | `#C8102E` | Ugandan-flag red: hearts, crane wattle, accents (white text 5.9:1) |
| `lake` | `#0B5CAD` | Swedish blue / Lake Victoria: primary buttons, links (white text 6.6:1) |
| `leaf` | `#1E7B34` | warm green: correct answers, completed lessons (white text 5.5:1) |
| `mist` | `#EEF5FB` | page background |

- **Type:** *Fredoka* (rounded, friendly) for headings and buttons, and *Nunito* for body text. Both are self-hosted through `@fontsource` (no Google requests).
- **Layout:** a single centred column (max 560 px) on phones, and the same column with more air on tablets and desktop. The path is a vertical sequence of round lesson bubbles that zig-zags left and right like a river, with a unit banner on top of each section.
- **Principles:** pictures before words, one decision per screen, the main button always at the bottom, and celebrations that are short and skippable.

## 3. Architecture
```
content/              ← editable by non-programmers (JSON)
  vocabulary.json     words AND phrases: id, lg, en, sv, category, page, difficulty, image, variants?, note?, check?
  units.json          units → lessons → word ids, + book fill-ins and questions (book order)
  story.json          10 chapters: scenes (narration with {wordId} highlights), dialogue lines, questions
  CONTENT_REPORT.md
public/audio/         <word-id>.mp3 recordings (speaker icon shows only if present)
scripts/
  build-audio-manifest.mjs   scans public/audio → src/generated/audio-manifest.json + AUDIO_TODO.md
  validate-content.mjs       checks ids, references, required fields
src/
  i18n/en.json, sv.json      all UI text
  logic/                     pure TS, unit tested
    answer.ts      normalise + compare answers (case, spaces, accents, ng'→ŋ, double-letter hint)
    rng.ts         seeded random
    generator.ts   builds a lesson's exercise list from content
    progress.ts    XP, streak, hearts, lesson completion, badges
    srs.ts         Leitner spaced repetition
  state/        React context + localStorage persistence
  components/   Mascot (SVG), exercise views, buttons, top bar
  screens/      Onboarding, Path, Lesson, Story, Practice, Badges, Parent, Settings
tests/e2e/      Playwright specs (mobile + desktop projects)
```
- Routing: `HashRouter`, so it deploys to any static host with no rewrite rules.
- PWA: `vite-plugin-pwa` precaches everything (fonts, JSON, audio).
- No backend, no accounts, no analytics.

## 4. Exercise generation
For each lesson the generator takes the lesson's **new words**, a few **review words** from earlier lessons, and the lesson's **book fill-ins/questions**, and makes about 10–14 exercises in an easy → harder order:
1. picture match for each new word (only for words that have a picture)
2. tap the translation (multiple choice, both directions)
3. listen & pick (only if a recording exists for the word)
4. match pairs (4 pairs)
5. fill in the missing word (the book's fill-in sentences, plus blanks in multi-word phrases)
6. build the phrase from tiles (multi-word phrases)
6b. the book's own multiple-choice questions
7. type it (only in later lessons, difficulty ≥ 2; lenient checking)

Wrong answers are queued to come back once at the end of the lesson. Story questions live in Story mode.

## 5. Rules
- XP: +1 per correct answer, +10 for finishing a lesson, +5 bonus if perfect, +5 for a practice round, +15 for a story.
- Streak: counts consecutive local calendar days with at least one finished lesson, practice round or story. A missed day resets it quietly to 1 at the next activity.
- Hearts: 5 max. A wrong answer in a lesson costs 1. They refill 1 every 20 min, and fully after finishing a Practice round. Practice never costs hearts. At 0 hearts, lessons point you to Practice (always available).
- Unlocking: lesson *n* unlocks when *n−1* is finished. The story unlocks when its `unlockAfterLesson` is finished.

## 6. Testing
- **Vitest:** answer checking, generator, XP/streak/hearts, SRS, badges, content validation.
- **Playwright:** complete a full lesson in {sv, en} UI × {sv→lg, en→lg} track × {mobile 390×844, desktop 1280×800}. Plus story, practice, parent gate, and screenshots of every main screen.
- `npm run build` must pass with zero TypeScript errors.

## 7. Order of work
1. RESEARCH.md + PLAN.md ✅
2. Content JSON + CONTENT_REPORT.md + AUDIO_TODO.md
3. Scaffold (Vite, Tailwind, PWA) → logic + unit tests → UI screens → mascot
4. E2E tests → screenshots → visual fixes → build
5. README (sv + en), commit, push
