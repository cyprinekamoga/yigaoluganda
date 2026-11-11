import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { CLIPS } from '@/audio/clips';
import { hasAudio } from '@/audio/engine';
import { DIALOGUES, LESSONS, PHRASES, SENTENCES } from '@/content';
import { useLang } from '@/i18n';
import { LessonPlayer } from '@/lesson/LessonPlayer';
import { dayKey } from '@/logic/dates';
import { buildReview, buildTiles, choiceStep, type GenContext, type Step } from '@/logic/generator';
import { hashString, makeRng, shuffle } from '@/logic/rng';
import { dueIds, weakestIds } from '@/logic/srs';
import { useApp } from '@/state/store';

type Mode = 'review' | 'dialogue' | 'listen' | 'speak';

/** Practice Lab sessions. Practice never spills water; a review or listening round fills the pots. */
export default function PracticeRoute() {
  const { mode, id } = useLocalSearchParams<{ mode: Mode; id?: string }>();
  const lang = useLang();
  const [setup] = useState(() => {
    const s = useApp.getState();
    const ctx: GenContext = { lang, name: s.profile?.name ?? '', hasAudio, seed: Date.now() % 100_000 };
    const finishedSentences = Object.keys(s.done).flatMap((lid) => LESSONS[lid]?.lesson.sentences ?? []);
    let steps: Step[] = [];
    let kind: 'review' | 'dialogue' | 'speak' = 'review';

    if (mode === 'review') {
      const today = dayKey();
      const due = dueIds(s.srs, today, 8);
      const ids = due.length >= 4 ? due : Array.from(new Set([...due, ...weakestIds(s.srs, 8)])).slice(0, 8);
      steps = buildReview(ids, finishedSentences, ctx);
    } else if (mode === 'dialogue' && id && DIALOGUES[id]) {
      steps = [{ kind: 'dialogue', dialogueId: id }];
      kind = 'dialogue';
    } else if (mode === 'speak' && id && PHRASES[id]) {
      steps = [{ kind: 'speak', phraseId: id }];
      kind = 'speak';
    } else if (mode === 'listen') {
      const rng = makeRng(hashString(String(ctx.seed)));
      const learned = Object.keys(s.srs).filter(hasAudio);
      const pool = shuffle(learned.length >= 4 ? learned : Object.keys(CLIPS).filter((k) => PHRASES[k]), rng).slice(0, 8);
      steps = pool.map((pid) => choiceStep(pid, ctx, rng, pool));
      const dict = shuffle(Object.keys(CLIPS).filter((k) => SENTENCES[k] && !SENTENCES[k].lg.includes('{name}')), rng).slice(0, 2);
      for (const sid of dict) steps.push({ kind: 'dictation', sentenceId: sid, ...buildTiles(SENTENCES[sid], ctx.name, rng) });
    }
    return { ctx, steps, kind };
  });

  if (!setup.steps.length) return <Redirect href="/practice" />;
  return <LessonPlayer steps={setup.steps} mode={{ kind: 'practice', practice: setup.kind }} ctx={setup.ctx} />;
}
