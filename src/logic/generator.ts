import { DIALOGUES, PHRASES, SENTENCES, SOUND_PAIRS, TIPS, UNITS, type Lang, type LessonRef, type Sentence } from '../content';
import { hashString, makeRng, pick, shuffle, type Rng } from './rng';
import { normalize, optionForm, tilesOf } from './text';

/**
 * Lesson engine. A lesson is a list of ~10 steps built from 7 exercise patterns:
 *  - choice     Pick the word (listen, or read the meaning, then pick the right Luganda word;
 *               the other options are different words, never the same word spelled differently)
 *  - match      Tap & Match pairs
 *  - build      Word-bank sentence builder
 *  - dictation  Audio dictation (only when a recording exists)
 *  - speak      Speak & compare (only when a recording exists; not graded)
 *  - dialogue   Contextual roleplay chat
 *  - tip        Cultural tip card (not graded)
 * plus `intro` cards that present each new phrase before it is tested.
 */
export type Step =
  | { kind: 'intro'; phraseId: string }
  | { kind: 'tip'; tipId: string }
  | { kind: 'choice'; mode: 'read' | 'listen'; phraseId: string; options: string[]; answer: string }
  | { kind: 'match'; phraseIds: string[] }
  | { kind: 'build'; sentenceId: string; tiles: string[]; answer: string[] }
  | { kind: 'dictation'; sentenceId: string; tiles: string[]; answer: string[] }
  | { kind: 'speak'; phraseId: string }
  /** Write the Luganda for a meaning (the hardest check, for phrases already met). */
  | { kind: 'type'; phraseId: string }
  | { kind: 'dialogue'; dialogueId: string };

export type StepKind = Step['kind'];

export const GRADED: ReadonlySet<StepKind> = new Set(['choice', 'match', 'build', 'dictation', 'dialogue', 'type']);

export interface GenContext {
  lang: Lang;
  name: string;
  hasAudio: (id: string) => boolean;
  /** Changes the shuffle between attempts. */
  seed?: number;
  /** Phrases the learner has already met. Review phrases they haven't met get an intro card first. */
  known?: (id: string) => boolean;
}

export const MIN_STEPS = 8;
export const MAX_STEPS = 13;

/** Letters only, with doubled letters as one: "okusiiba" and "okusiba" squash to the same. */
const squash = (s: string) =>
  normalize(s)
    .replace(/[^a-zŋ]/g, '')
    .replace(/(.)\1+/g, '$1');

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Two forms a beginner would take for the same word spelled differently: the same once doubled
 * letters are counted once (siba / siiba), one letter apart, or one inside the other
 * (bulungi / ndi bulungi). Such forms are never offered side by side.
 */
export function looksAlike(a: string, b: string): boolean {
  const x = squash(a);
  const y = squash(b);
  if (x === y) return true;
  if (Math.min(x.length, y.length) < 3) return false;
  return editDistance(x, y) <= 1 || x.includes(y) || y.includes(x);
}

const meaningKey = (id: string) => [normalize(PHRASES[id].tr.en), normalize(PHRASES[id].tr.sv)];
const UNIT_OF: Record<string, number> = Object.fromEntries(UNITS.flatMap((u) => u.phrases.map((p) => [p.id, u.n])));

/**
 * Wrong options for a phrase: other words with other meanings. First the lesson's own phrases (just
 * seen), then phrases of the same kind (greetings, numbers…) in the same part, then the part, then
 * the whole course. Never the same word spelled differently, and never another way to say the same
 * thing (that would be a second right answer).
 */
export function wordDistractors(phraseId: string, rng: Rng, pool: string[] = [], n = 2): string[] {
  const p = PHRASES[phraseId];
  const forms = [p.lg, ...(p.variants ?? [])];
  const [en, sv] = meaningKey(phraseId);
  const unit = UNIT_OF[phraseId];
  const all = Object.keys(PHRASES);
  const tiers = [
    pool,
    all.filter((id) => UNIT_OF[id] === unit && PHRASES[id].category === p.category),
    all.filter((id) => UNIT_OF[id] === unit),
    all,
  ];
  const out: string[] = [];
  for (const tier of tiers) {
    for (const id of shuffle(tier, rng)) {
      if (out.length >= n) return out;
      const q = PHRASES[id];
      if (!q || id === phraseId) continue;
      const [qen, qsv] = meaningKey(id);
      if (qen === en || qsv === sv) continue;
      const f = optionForm(q.lg);
      const candidate = [q.lg, ...(q.variants ?? [])];
      if (forms.some((a) => candidate.some((b) => looksAlike(a, b)))) continue;
      if (out.some((o) => looksAlike(o, f))) continue;
      out.push(f);
    }
  }
  return out;
}

/** Pick the word: the answer and two other words (different meanings, never look-alike spellings). */
export function choiceStep(phraseId: string, ctx: GenContext, rng: Rng, pool: string[] = []): Step {
  const p = PHRASES[phraseId];
  const answer = optionForm(p.lg);
  const options = [answer, ...wordDistractors(phraseId, rng, pool, 2)];
  return {
    kind: 'choice',
    mode: ctx.hasAudio(phraseId) ? 'listen' : 'read',
    phraseId,
    options: shuffle(options, rng),
    answer,
  };
}

const ALL_TILES: string[] = Array.from(
  new Set(UNITS.flatMap((u) => u.sentences.flatMap((s) => tilesOf(s.lg.replace(/\{name\}/g, ''), '-').map((t) => t.toLowerCase())))),
).filter(Boolean);

/** Luganda words from a set of phrase and sentence ids, used as nearby distractor tiles. */
export function wordsOf(phraseIds: string[], sentenceIds: string[] = []): string[] {
  const texts = [...phraseIds.map((id) => PHRASES[id]?.lg ?? ''), ...sentenceIds.map((id) => (SENTENCES[id]?.lg ?? '').replace(/\{name\}/g, ''))];
  return Array.from(new Set(texts.flatMap((t) => tilesOf(t, '-').map((w) => w.toLowerCase())))).filter(Boolean);
}

/**
 * Word-bank tiles: the sentence's words plus 2–3 believable extras.
 * Extras come from `nearby` (the lesson's own words) first, so they are words the learner has just seen.
 */
export function buildTiles(sentence: Sentence, name: string, rng: Rng, nearby: string[] = []): { tiles: string[]; answer: string[] } {
  const answer = tilesOf(sentence.lg, name);
  const inAnswer = new Set(answer.map((t) => normalize(t)));
  const extraCount = answer.length <= 2 ? 2 : 3;
  const candidates = sentence.distractors ?? [...shuffle(nearby, rng), ...shuffle(ALL_TILES, rng)];
  const extras: string[] = [];
  for (const c of candidates) {
    if (extras.length >= extraCount) break;
    if (inAnswer.has(normalize(c)) || extras.includes(c)) continue;
    extras.push(c);
  }
  return { tiles: shuffle([...answer, ...extras], rng), answer };
}

export function buildLesson(ref: LessonRef, ctx: GenContext): Step[] {
  const { lesson } = ref;
  const rng = makeRng(hashString(lesson.id) ^ (ctx.seed ?? 0));
  const newIds = lesson.phrases.filter((id) => PHRASES[id]);
  const reviewIds = (lesson.review ?? []).filter((id) => PHRASES[id]);
  const pool = [...newIds, ...reviewIds];

  const core: Step[] = [];
  const checked = new Set<string>();
  const introChecks: Step[] = [];

  // 1. Teach new phrases, checking one of every two right after it is introduced.
  newIds.forEach((id, i) => {
    core.push({ kind: 'intro', phraseId: id });
    const pairEnd = i % 2 === 1 || i === newIds.length - 1;
    if (pairEnd) {
      const pairIds = i % 2 === 1 ? [newIds[i - 1], id] : [id];
      const target = pick(pairIds, rng);
      const check = choiceStep(target, ctx, rng, pool);
      core.push(check);
      introChecks.push(check);
      checked.add(target);
    }
  });

  // Chapters can be played in any order, so a review phrase may be brand new to this learner.
  for (const id of reviewIds) {
    if (ctx.known && !ctx.known(id)) core.push({ kind: 'intro', phraseId: id });
  }

  // 2. Cultural tip.
  if (lesson.tip && TIPS[lesson.tip]) core.push({ kind: 'tip', tipId: lesson.tip });

  // 3. A word from each sound pair (siba / siiba), picked among different words: beginners learn
  //    the long and short sounds from the intro cards, not from look-alike options.
  for (const pairId of lesson.sounds ?? []) {
    const pair = SOUND_PAIRS[pairId];
    if (pair) core.push(choiceStep(rng() < 0.5 ? pair.a : pair.b, ctx, rng, pool));
  }

  // 4. Tap & match with up to 4 pairs, new phrases first.
  if (pool.length >= 3) {
    const matchIds = [...newIds, ...shuffle(reviewIds, rng)].slice(0, 4);
    core.push({ kind: 'match', phraseIds: matchIds });
  }

  // 5. Write one new phrase from memory, once it has been introduced, checked and matched.
  const typeTarget = newIds.find((id) => checked.has(id)) ?? newIds[0];
  const typing: Step[] = typeTarget ? [{ kind: 'type', phraseId: typeTarget }] : [];
  core.push(...typing);

  // 6. Review checks (up to 2): a phrase the learner already knows is written, the other picked.
  let typedReview = false;
  const reviewChecks: Step[] = shuffle(reviewIds, rng)
    .slice(0, 2)
    .map((id) => {
      checked.add(id);
      if (!typedReview && ctx.known?.(id)) {
        typedReview = true;
        return { kind: 'type', phraseId: id } as Step;
      }
      return choiceStep(id, ctx, rng, pool);
    });
  core.push(...reviewChecks);

  // 7. Sentence building, then dictation and speaking when recordings exist.
  const sentenceIds = (lesson.sentences ?? []).filter((id) => SENTENCES[id]);
  const nearby = wordsOf(pool, sentenceIds);
  const builds: Step[] = sentenceIds.slice(0, 3).map((id) => ({ kind: 'build', sentenceId: id, ...buildTiles(SENTENCES[id], ctx.name, rng, nearby) }));
  core.push(...builds);

  const dictId = sentenceIds.find((id) => ctx.hasAudio(id));
  if (dictId) core.push({ kind: 'dictation', sentenceId: dictId, ...buildTiles(SENTENCES[dictId], ctx.name, rng, nearby) });

  const speakId = [...newIds, ...reviewIds].find((id) => ctx.hasAudio(id));
  if (speakId) core.push({ kind: 'speak', phraseId: speakId });

  // 8. Pad short lessons with extra word checks before the dialogue.
  const unchecked = shuffle(pool.filter((id) => !checked.has(id)), rng);
  while (core.length < MIN_STEPS - (lesson.dialogue ? 1 : 0) && unchecked.length) {
    core.push(choiceStep(unchecked.shift()!, ctx, rng, pool));
  }

  // 9. Trim long lessons: review checks first, then a third build, then extra intro checks.
  // Writing from memory is the last to go.
  const trimOrder: Step[] = [...reviewChecks, ...builds.slice(2), ...introChecks.slice(1), ...builds.slice(1, 2), ...typing];
  while (core.length > MAX_STEPS - (lesson.dialogue ? 1 : 0) && trimOrder.length) {
    const victim = trimOrder.shift()!;
    core.splice(core.indexOf(victim), 1);
  }

  // 10. Finish with the roleplay.
  if (lesson.dialogue && DIALOGUES[lesson.dialogue]) core.push({ kind: 'dialogue', dialogueId: lesson.dialogue });

  return core;
}

/**
 * Practice Lab review round: word checks and a match over the weakest phrases,
 * plus a sentence or two the learner has already met.
 */
export function buildReview(phraseIds: string[], sentenceIds: string[], ctx: GenContext): Step[] {
  const rng = makeRng(hashString(phraseIds.join('|')) ^ (ctx.seed ?? 0));
  const ids = phraseIds.filter((id) => PHRASES[id]).slice(0, 8);
  if (ids.length === 0) return [];
  const steps: Step[] = [];
  const firstHalf = ids.slice(0, 4);
  firstHalf.forEach((id) => steps.push(choiceStep(id, ctx, rng, ids)));
  if (ids.length >= 3) steps.push({ kind: 'match', phraseIds: shuffle(ids, rng).slice(0, 4) });
  // The weakest phrases are picked first; the rest (already met) are written from memory.
  ids.slice(4, 7).forEach((id) => steps.push({ kind: 'type', phraseId: id }));
  const nearby = wordsOf(ids, sentenceIds);
  for (const sid of shuffle(sentenceIds.filter((s) => SENTENCES[s]), rng).slice(0, 2)) {
    steps.push({ kind: 'build', sentenceId: sid, ...buildTiles(SENTENCES[sid], ctx.name, rng, nearby) });
  }
  const dict = sentenceIds.find((s) => ctx.hasAudio(s));
  if (dict) steps.push({ kind: 'dictation', sentenceId: dict, ...buildTiles(SENTENCES[dict], ctx.name, rng, nearby) });
  return steps.slice(0, 10);
}

/** A graded step that was answered wrongly comes back once at the end, reshuffled. */
export function retryStep(step: Step, ctx: GenContext, attempt: number): Step {
  const rng = makeRng(hashString(JSON.stringify(step)) ^ attempt);
  switch (step.kind) {
    case 'choice':
      return { ...step, options: shuffle(step.options, rng) };
    case 'build':
    case 'dictation':
      return { ...step, tiles: shuffle(step.tiles, rng) };
    default:
      return step;
  }
}

/** Phrase ids a step exercises (for spaced repetition). */
export function phrasesInStep(step: Step): string[] {
  switch (step.kind) {
    case 'intro':
    case 'choice':
    case 'speak':
    case 'type':
      return [step.phraseId];
    case 'match':
      return step.phraseIds;
    default:
      return [];
  }
}
