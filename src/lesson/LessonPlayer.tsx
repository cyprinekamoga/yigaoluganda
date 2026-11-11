import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { preloadClips, releaseClips } from '../audio/engine';
import { completeFeedback, correctFeedback, wrongFeedback } from '../audio/feedback';
import { useT } from '../i18n';
import { phrasesInStep, retryStep, type GenContext, type Step } from '../logic/generator';
import { regenHearts } from '../logic/progress';
import { useApp, type Reward } from '../state/store';
import { Button } from '../ui/Button';
import { Beads } from '../ui/Beads';
import { PotIcon } from '../ui/Icons';
import { Sheet } from '../ui/Sheet';
import { PotsSheet, useNow } from '../ui/StatsBar';
import { C, F, MAX_W, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { Complete } from './Complete';
import { BuildStep } from './exercises/Build';
import { ChoiceStep } from './exercises/Choice';
import { DialogueStep } from './exercises/Dialogue';
import { IntroStep } from './exercises/Intro';
import { MatchStep } from './exercises/Match';
import { SpeakStep } from './exercises/Speak';
import { TipStep } from './exercises/Tip';
import { FeedbackCard } from './FeedbackCard';
import type { Result } from './types';

export type PlayMode = { kind: 'lesson'; lessonId: string } | { kind: 'practice'; practice: 'review' | 'dialogue' | 'speak' };

const RETRYABLE = new Set<Step['kind']>(['choice', 'build', 'dictation']);

export function LessonPlayer({ steps, mode, ctx }: { steps: Step[]; mode: PlayMode; ctx: GenContext }) {
  const router = useRouter();
  const { t } = useT();
  const [queue, setQueue] = useState<Step[]>(steps);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ result: Result; heartLost: boolean } | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  // Opening a lesson with every water pot empty shows the empty-pots sheet straight away.
  const [outOfHearts, setOutOfHearts] = useState(() => mode.kind === 'lesson' && regenHearts(useApp.getState().stats, Date.now()).hearts <= 0);
  const attempts = useRef(0);
  const mistakes = useRef(0);
  const retried = useRef(new Set<number>());

  const name = useApp((s) => s.profile?.name ?? '');
  const meet = useApp((s) => s.meet);
  const gradePhrases = useApp((s) => s.gradePhrases);
  const loseHeart = useApp((s) => s.loseHeart);
  const completeLesson = useApp((s) => s.completeLesson);
  const completePractice = useApp((s) => s.completePractice);
  const stats = useApp((s) => s.stats);
  const now = useNow(5_000);
  const hearts = regenHearts(stats, now).hearts;
  const usesHearts = mode.kind === 'lesson';

  const step = queue[index];

  // Pre-buffer every recording this lesson uses, so taps play instantly.
  useEffect(() => {
    const ids = steps.flatMap((s) => [...phrasesInStep(s), ...('sentenceId' in s ? [s.sentenceId] : [])]);
    preloadClips(ids);
    return () => releaseClips();
  }, [steps]);

  useEffect(() => {
    if (step?.kind === 'intro') meet([step.phraseId]);
  }, [step, meet]);

  const spendHeart = (): boolean => {
    if (!usesHearts) return false;
    loseHeart();
    if (regenHearts(useApp.getState().stats, Date.now()).hearts <= 0) setOutOfHearts(true);
    return true;
  };

  const onMistake = () => {
    attempts.current += 1;
    mistakes.current += 1;
    spendHeart();
  };

  const onResult = (r: Result) => {
    attempts.current += 1;
    const ids = phrasesInStep(step);
    if (ids.length) gradePhrases(ids, r.correct);
    let heartLost = false;
    if (r.correct) {
      if (step.kind !== 'match') correctFeedback();
    } else {
      if (step.kind !== 'match') {
        wrongFeedback();
        mistakes.current += 1;
        heartLost = spendHeart();
      }
      if (RETRYABLE.has(step.kind) && !retried.current.has(index)) {
        retried.current.add(index);
        setQueue((q) => [...q, retryStep(step, ctx, q.length)]);
      }
    }
    setFeedback({ result: r, heartLost });
  };

  const finish = () => {
    const graded = attempts.current;
    const rw =
      mode.kind === 'lesson'
        ? completeLesson({ lessonId: mode.lessonId, graded, mistakes: mistakes.current })
        : completePractice(mode.practice);
    completeFeedback();
    setReward(rw);
  };

  const next = () => {
    setFeedback(null);
    if (index + 1 >= queue.length) finish();
    else setIndex((i) => i + 1);
  };

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // New phrases this lesson introduced, or for practice every phrase it went over.
  const phrases = useMemo(() => {
    const ids = mode.kind === 'lesson' ? steps.flatMap((s) => (s.kind === 'intro' ? [s.phraseId] : [])) : steps.flatMap(phrasesInStep);
    return [...new Set(ids)];
  }, [steps, mode.kind]);

  if (reward) {
    return <Complete reward={reward} phrases={phrases} practice={mode.kind === 'practice'} onDone={exit} />;
  }
  if (!step) return null;

  const common = {
    locked: Boolean(feedback),
    name,
    onResult,
    onMistake,
    onNext: next,
    after: feedback ? <FeedbackCard result={feedback.result} seed={index} heartLost={feedback.heartLost} /> : undefined,
    footer: feedback ? <Button testID="feedback-continue" label={t('common.continue')} onPress={next} /> : undefined,
  };
  let body: React.ReactNode;
  switch (step.kind) {
    case 'intro':
      body = <IntroStep key={index} step={step} {...common} />;
      break;
    case 'tip':
      body = <TipStep key={index} step={step} {...common} />;
      break;
    case 'choice':
      body = <ChoiceStep key={index} step={step} {...common} />;
      break;
    case 'match':
      body = <MatchStep key={index} step={step} {...common} />;
      break;
    case 'build':
    case 'dictation':
      body = <BuildStep key={index} step={step} {...common} />;
      break;
    case 'speak':
      body = <SpeakStep key={index} step={step} {...common} />;
      break;
    case 'dialogue':
      body = <DialogueStep key={index} step={step} {...common} />;
      break;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="lesson-player">
      <View style={styles.top}>
        {usesHearts ? (
          <View style={styles.side} accessible accessibilityLabel={t('stats.heartsA11y', { n: hearts })} testID="lesson-hearts">
            <PotIcon size={24} off={hearts === 0} />
            <Txt style={styles.potsText}>{hearts}</Txt>
          </View>
        ) : (
          <View style={styles.side}>
            <Txt variant="caption" style={styles.practiceTag} numberOfLines={1}>
              {t('lesson.practiceMode')}
            </Txt>
          </View>
        )}
        <Beads fit total={queue.length} done={index} current={index} size={12} style={styles.beads} accessibilityLabel={t('lesson.stepOf', { n: index + 1, total: queue.length })} />
        <Pressable testID="lesson-close" onPress={() => setQuitOpen(true)} accessibilityRole="button" accessibilityLabel={t('lesson.leave')} hitSlop={10} style={[styles.side, styles.leave]}>
          <Txt style={styles.leaveText}>{t('lesson.leave')}</Txt>
        </Pressable>
      </View>

      <View style={styles.stage}>{body}</View>

      <Sheet visible={quitOpen} onClose={() => setQuitOpen(false)} testID="quit-sheet">
        <View style={{ gap: S.xs }}>
          <Txt variant="h3">{t('lesson.quitTitle')}</Txt>
          <Txt variant="body">{t('lesson.quitBody')}</Txt>
        </View>
        <Button label={t('lesson.keepGoing')} onPress={() => setQuitOpen(false)} />
        <Button
          testID="quit-confirm"
          kind="ghost"
          label={t('lesson.leave')}
          onPress={() => {
            setQuitOpen(false);
            exit();
          }}
        />
      </Sheet>

      <PotsSheet
        out
        visible={outOfHearts && hearts <= 0}
        onClose={() => {
          setOutOfHearts(false);
          if (regenHearts(useApp.getState().stats, Date.now()).hearts <= 0) exit();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.sm, minHeight: 56, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  side: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64, minHeight: 44 },
  potsText: { ...F.semi, fontSize: 17, color: C.tomatoDeep },
  practiceTag: { color: C.neon },
  beads: { flex: 1 },
  leave: { justifyContent: 'flex-end' },
  leaveText: { ...F.semi, fontSize: 16, color: C.ink2 },
  stage: { flex: 1 },
});
