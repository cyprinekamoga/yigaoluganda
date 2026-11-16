import { describe, expect, it } from 'vitest';
import { ALL_CHAPTERS, DIALOGUES, FACTS, LESSONS, PHRASES, SENTENCES, SOUND_PAIRS, TIPS, UNITS, type T, type Unit } from './index';
import { buildLesson, MAX_STEPS, MIN_STEPS } from '../logic/generator';
import { normalize } from '../logic/text';

const filled = (t: T | undefined) => Boolean(t && t.en.trim() && t.sv.trim());

describe('course', () => {
  it('has Part 1 (13 chapters) and Part 2 (9 chapters), numbered in order', () => {
    expect(UNITS.map((u) => u.chapters.length)).toEqual([13, 9]);
    expect(ALL_CHAPTERS.map((c) => c.n)).toEqual(ALL_CHAPTERS.map((_, i) => i + 1));
  });

  it('starts with greetings, then introductions, then the everyday words', () => {
    expect(ALL_CHAPTERS.slice(0, 3).map((c) => c.title.en)).toEqual(['Informal Greetings', 'Introductions & Names', 'Everyday Words']);
  });

  it('ends every part with its one final conversation', () => {
    for (const unit of UNITS) {
      expect(unit.chapters[unit.chapters.length - 1].checkpoint, unit.id).toBe(true);
      expect(unit.chapters.filter((c) => c.checkpoint), unit.id).toHaveLength(1);
    }
  });

  it('uses unique, kebab-case ids across the whole course', () => {
    const ids = UNITS.flatMap((unit: Unit) => [
      ...unit.phrases.map((p) => p.id),
      ...unit.sentences.map((s) => s.id),
      ...unit.tips.map((t) => t.id),
      ...unit.dialogues.map((d) => d.id),
      ...unit.soundPairs.map((s) => s.id),
      ...unit.roots.map((r) => r.id),
      ...unit.chapters.map((c) => c.id),
      ...unit.chapters.flatMap((c) => c.lessons.map((l) => l.id)),
    ]);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe.each(UNITS)('content of part $n', (unit) => {

  it('translates everything into English and Swedish', () => {
    for (const p of unit.phrases) {
      expect(p.lg.trim(), p.id).not.toBe('');
      expect(filled(p.tr), p.id).toBe(true);
      if (p.literal) expect(filled(p.literal), p.id).toBe(true);
      if (p.note) expect(filled(p.note), p.id).toBe(true);
    }
    for (const s of unit.sentences) expect(filled(s.tr), s.id).toBe(true);
    for (const t of unit.tips) expect(filled(t.title) && filled(t.body), t.id).toBe(true);
    for (const c of unit.chapters) {
      expect(filled(c.title) && filled(c.scenario), c.id).toBe(true);
      for (const l of c.lessons) expect(filled(l.title), l.id).toBe(true);
    }
    for (const d of unit.dialogues) {
      expect(filled(d.title) && filled(d.setting), d.id).toBe(true);
      for (const line of d.lines) {
        if (line.kind === 'narrate') expect(filled(line.text), d.id).toBe(true);
        if (line.kind === 'say') expect(filled(line.tr), d.id).toBe(true);
        if (line.kind === 'choose') {
          expect(filled(line.prompt), d.id).toBe(true);
          for (const o of line.options) expect(filled(o.tr), `${d.id} ${o.lg}`).toBe(true);
        }
      }
    }
  });

  it('only references things that exist', () => {
    for (const ref of Object.values(LESSONS)) {
      const l = ref.lesson;
      for (const id of [...l.phrases, ...(l.review ?? [])]) expect(PHRASES[id], `${l.id} → ${id}`).toBeDefined();
      for (const id of l.sentences ?? []) expect(SENTENCES[id], `${l.id} → ${id}`).toBeDefined();
      for (const id of l.sounds ?? []) expect(SOUND_PAIRS[id], `${l.id} → ${id}`).toBeDefined();
      if (l.tip) expect(TIPS[l.tip], `${l.id} → ${l.tip}`).toBeDefined();
      if (l.dialogue) expect(DIALOGUES[l.dialogue], `${l.id} → ${l.dialogue}`).toBeDefined();
    }
    for (const sp of unit.soundPairs) {
      expect(PHRASES[sp.a]).toBeDefined();
      expect(PHRASES[sp.b]).toBeDefined();
    }
    for (const r of unit.roots) for (const id of r.examples) expect(PHRASES[id], `${r.id} → ${id}`).toBeDefined();
  });

  it('teaches every phrase exactly once', () => {
    const taught = unit.chapters.flatMap((c) => c.lessons.flatMap((l) => l.phrases));
    expect(new Set(taught).size).toBe(taught.length);
    expect(new Set(taught)).toEqual(new Set(unit.phrases.map((p) => p.id)));
  });

  it('uses every sentence, tip and dialogue somewhere', () => {
    const lessons = Object.values(LESSONS).map((r) => r.lesson);
    const usedS = new Set(lessons.flatMap((l) => l.sentences ?? []));
    const usedT = new Set(lessons.map((l) => l.tip).filter(Boolean));
    const usedD = new Set(lessons.map((l) => l.dialogue).filter(Boolean));
    expect(unit.sentences.filter((s) => !usedS.has(s.id)).map((s) => s.id)).toEqual([]);
    expect(unit.tips.filter((t) => !usedT.has(t.id)).map((t) => t.id)).toEqual([]);
    expect(unit.dialogues.filter((d) => !usedD.has(d.id)).map((d) => d.id)).toEqual([]);
  });

  it('gives every dialogue choice exactly one right answer and explains the wrong ones', () => {
    for (const d of unit.dialogues) {
      for (const line of d.lines) {
        if (line.kind === 'say') expect(d.cast[line.who], `${d.id}: unknown speaker ${line.who}`).toBeDefined();
        if (line.kind !== 'choose') continue;
        expect(line.options.filter((o) => o.correct), `${d.id}: ${line.prompt.en}`).toHaveLength(1);
        expect(line.options.length).toBeGreaterThanOrEqual(2);
        for (const o of line.options) if (!o.correct) expect(filled(o.why), `${d.id}: ${o.lg}`).toBe(true);
        const forms = line.options.map((o) => normalize(o.lg));
        expect(new Set(forms).size).toBe(forms.length);
      }
    }
  });

  it('has fun facts in English and Swedish with unique ids', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) expect(filled(f.text), f.id).toBe(true);
  });

  it('builds lessons of about 10 steps, with and without recordings', () => {
    for (const ref of Object.values(LESSONS)) {
      for (const hasAudio of [() => false, () => true]) {
        const steps = buildLesson(ref, { lang: 'en', name: 'Alex', hasAudio });
        expect(steps.length, ref.lesson.id).toBeGreaterThanOrEqual(MIN_STEPS - 1);
        expect(steps.length, ref.lesson.id).toBeLessThanOrEqual(MAX_STEPS);
      }
    }
  });
});
