import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { hasAudio } from '@/audio/engine';
import { LESSONS, UNITS } from '@/content';
import { useLang } from '@/i18n';
import { LessonPlayer } from '@/lesson/LessonPlayer';
import { buildLesson, type GenContext } from '@/logic/generator';
import { isAvailable, isLessonOpen } from '@/logic/unlock';
import { useApp } from '@/state/store';

export default function LessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useLang();
  const ref = LESSONS[id ?? ''];
  // Build the lesson once, from the state at the moment it opens.
  const [setup] = useState(() => {
    if (!ref) return null;
    const s = useApp.getState();
    const unit = UNITS.find((u) => u.id === ref.unit.id)!;
    const open = isAvailable(unit, ref.chapter, s.done) && isLessonOpen(ref.chapter, ref.index, s.done);
    const ctx: GenContext = {
      lang,
      name: s.profile?.name ?? '',
      hasAudio,
      seed: s.done[ref.lesson.id]?.plays ?? 0,
      known: (pid) => Boolean(s.srs[pid]),
    };
    return { open, ctx, steps: buildLesson(ref, ctx) };
  });

  if (!ref || !setup) return <Redirect href="/" />;
  if (!setup.open) return <Redirect href={`/chapter/${ref.chapter.id}`} />;
  return <LessonPlayer steps={setup.steps} mode={{ kind: 'lesson', lessonId: ref.lesson.id }} ctx={setup.ctx} />;
}
