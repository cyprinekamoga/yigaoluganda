import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { preloadClips, releaseClips } from '../audio/engine';
import { completeFeedback, correctFeedback, wrongFeedback } from '../audio/feedback';
import { useT } from '../i18n';
import { GRADED, phrasesInStep, retryStep, type GenContext, type Step } from '../logic/generator';
import { regenHearts } from '../logic/progress';
import { useApp, type Reward } from '../state/store';
import { Button } from '../ui/Button';
import { HeartIcon } from '../ui/Icons';
import { Ngaali } from '../ui/Ngaali';
import { Sheet } from '../ui/Sheet';
import { HeartsSheet } from '../ui/StatsBar';
import { C, F, MAX_W, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { Complete } from './Complete';
import { BuildStep } from './exercises/Build';
import { ChoiceStep } from './exercises/Choice';
import { DialogueStep } from './exercises/Dialogue';
import { IntroStep } from './exercises/Intro';
import { MatchStep } from './exercises/Match';
import { SpeakStep } from './exercises/Speak';
import { TipStep } from './exercises/Tip';
import { FeedbackPanel } from './FeedbackPanel';
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
  const [outOfHearts, setOutOfHearts] = useState(false);
  const attempts = useRef(0);
  const mistakes = useRef(0);
  const retried = useRef(new Set<number>());
  const [accuracy, setAccuracy] = useState(1);

  const name = useApp((s) => s.profile?.name ?? '');
  const meet = useApp((s) => s.meet);
  const gradePhrases = useApp((s) => s.gradePhrases);
  const loseHeart = useApp((s) => s.loseHeart);
  const completeLesson = useApp((s) => s.completeLesson);
  const completePractice = useApp((s) => s.completePractice);
  const stats = useApp((s) => s.stats);
  const hearts = regenHearts(stats, Date.now()).hearts;
  const usesHearts = mode.kind === 'lesson';

  const step = queue[index];

  // Pre-buffer every recording this lesson uses, so taps play instantly.
  useEffect(() => {
    const ids = steps.flatMap((s) => [...phrasesInStep(s), ...('sentenceId' in s ? [s.sentenceId] : [])]);
    preloadClips(ids);
    return () => releaseClips();
  }, [steps]);

  // Entering a lesson with no hearts left.
  useEffect(() => {
    if (usesHearts && hearts <= 0) setOutOfHearts(true);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setAccuracy(graded ? Math.max(0, (graded - mistakes.current) / graded) : 1);
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

  const progress = useMemo(() => (queue.length ? index / queue.length : 0), [index, queue.length]);

  if (reward) {
    return <Complete reward={reward} accuracy={accuracy} practice={mode.kind === 'practice'} onDone={exit} />;
  }
  if (!step) return null;

  const common = { locked: Boolean(feedback), name, onResult, onMistake, onNext: next };
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
        <Pressable testID="lesson-close" onPress={() => setQuitOpen(true)} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={28} color={C.ink2} />
        </Pressable>
        <View
          style={styles.bar}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: queue.length, now: index }}
        >
          <View style={[styles.fillBar, { width: `${Math.max(4, progress * 100)}%` }]} />
        </View>
        {usesHearts ? (
          <View style={styles.hearts} accessibilityLabel={t('stats.heartsA11y', { n: hearts })} testID="lesson-hearts">
            <HeartIcon size={24} off={hearts === 0} />
            <Txt style={styles.heartsText}>{hearts}</Txt>
          </View>
        ) : (
          <View style={styles.practiceTag}>
            <Txt variant="caption" style={{ color: C.leafDeep }}>
              {t('tabs.practice')}
            </Txt>
          </View>
        )}
      </View>

      <View style={styles.stage}>{body}</View>

      {feedback && <FeedbackPanel result={feedback.result} seed={index} heartLost={feedback.heartLost} onContinue={next} />}

      <Sheet visible={quitOpen} onClose={() => setQuitOpen(false)} testID="quit-sheet">
        <View style={styles.sheetRow}>
          <Ngaali mood="incorrect" size={64} />
          <View style={{ flex: 1, gap: S.xs }}>
            <Txt variant="h3">{t('lesson.quitTitle')}</Txt>
            <Txt variant="body">{t('lesson.quitBody')}</Txt>
          </View>
        </View>
        <Button label={t('lesson.keepGoing')} onPress={() => setQuitOpen(false)} />
        <Button
          testID="quit-confirm"
          kind="ghost"
          label={t('lesson.quit')}
          onPress={() => {
            setQuitOpen(false);
            exit();
          }}
        />
      </Sheet>

      <HeartsSheet
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
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.sm, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 14, borderRadius: R.pill, backgroundColor: C.paperDeep, overflow: 'hidden' },
  fillBar: { height: 14, borderRadius: R.pill, backgroundColor: C.leaf },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 48 },
  heartsText: { ...F.semi, fontSize: 17, color: C.redDeep },
  practiceTag: { backgroundColor: C.leafSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  stage: { flex: 1 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
