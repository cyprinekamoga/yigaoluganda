import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHAPTERS, PHRASES } from '@/content';
import { useT } from '@/i18n';
import { answer, chaptersToSkip, progress, questionFor, START, stop, TESTED, type PlacementState } from '@/logic/placement';
import { useApp } from '@/state/store';
import { Beads } from '@/ui/Beads';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Ngaali } from '@/ui/Ngaali';
import { C, F, MAX_W, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

type Phase = 'intro' | 'question' | 'result';

/** "Already know some Luganda?" See logic/placement.ts for how the test works. */
export default function Placement() {
  const { t, tr, lang } = useT();
  const router = useRouter();
  const placeOut = useApp((s) => s.placeOut);
  const setPlacementSeen = useApp((s) => s.setPlacementSeen);
  const [phase, setPhase] = useState<Phase>('intro');
  const [state, setState] = useState<PlacementState>(START);
  const [picked, setPicked] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const finishWith = (next: PlacementState) => {
    setState(next);
    if (next.finished) setPhase('result');
  };

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="screen-placement">
        <ScrollView contentContainerStyle={[styles.body, styles.center]}>
          <Ngaali mood="think" size={130} />
          <Txt variant="title" style={styles.centerText} accessibilityRole="header">
            {t('place.title')}
          </Txt>
          <Txt variant="body" style={[styles.centerText, { color: C.ink2 }]}>
            {t('place.body')}
          </Txt>
          <View style={styles.actions}>
            <Button testID="placement-start" label={t('place.start')} onPress={() => setPhase('question')} />
            <Button
              kind="ghost"
              label={t('place.notNow')}
              onPress={() => {
                setPlacementSeen();
                leave();
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'result') {
    const skip = chaptersToSkip(state.passed);
    const known = state.passed.length;
    const next = TESTED[state.passed.length];
    const message =
      known === 0
        ? t('place.resultNone')
        : !next
          ? t('place.resultAll')
          : known === 1
            ? t('place.resultOne')
            : t('place.resultSome', { n: known, next: next.n });
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="placement-result">
        <ScrollView contentContainerStyle={[styles.body, styles.center]}>
          <Ngaali mood={known ? 'correct' : 'wave'} size={120} />
          <Txt variant="title" style={styles.centerText} accessibilityRole="header">
            {t('place.resultTitle')}
          </Txt>
          <Txt variant="body" style={styles.centerText} testID="placement-message">
            {message}
          </Txt>
          {skip.length > 0 && (
            <Card style={styles.list}>
              {skip.map((id, i) => (
                <View key={id} style={[styles.row, i > 0 && styles.rule]}>
                  <Txt style={styles.rowN}>{CHAPTERS[id].n}</Txt>
                  <View style={{ flex: 1 }}>
                    <Txt variant="strong">{CHAPTERS[id].lgTitle}</Txt>
                    <Txt variant="small">{tr(CHAPTERS[id].title)}</Txt>
                  </View>
                </View>
              ))}
            </Card>
          )}
          <View style={styles.actions}>
            {skip.length > 0 ? (
              <>
                <Button
                  testID="placement-skip"
                  label={t('place.skip')}
                  onPress={() => {
                    placeOut(skip);
                    leave();
                  }}
                />
                <Button
                  kind="ghost"
                  label={t('place.fromStart')}
                  onPress={() => {
                    setPlacementSeen();
                    leave();
                  }}
                />
              </>
            ) : (
              <Button
                testID="placement-done"
                label={t('place.toChapters')}
                onPress={() => {
                  setPlacementSeen();
                  leave();
                }}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const q = questionFor(state, lang);
  const chapter = CHAPTERS[q.chapterId];
  const p = PHRASES[q.phraseId];
  const { done, total } = progress(state);
  const choose = (id: string | null) => {
    if (picked) return;
    setPicked(id ?? 'none');
    setTimeout(() => {
      setPicked(null);
      finishWith(answer(state, id === q.phraseId));
    }, 650);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="placement-question">
      <View style={styles.top}>
        <Beads fit total={total} done={done} current={state.index} size={10} style={{ flex: 1 }} accessibilityLabel={t('place.progress', { n: chapter.n, total: TESTED[TESTED.length - 1].n })} />
        <Pressable testID="placement-stop" onPress={() => finishWith(stop(state))} accessibilityRole="button" hitSlop={10} style={styles.stop}>
          <Txt style={styles.stopText}>{t('place.stop')}</Txt>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="label">
          {t('home.chapter', { n: chapter.n })} · {chapter.lgTitle}
        </Txt>
        <Txt variant="h2" accessibilityRole="header" testID="placement-prompt">
          {q.mode === 'toLg' ? t('lesson.choiceRead', { meaning: p.tr[lang] }) : t('place.toMeaning', { lg: p.lg })}
        </Txt>
        <View style={styles.options} accessibilityRole="radiogroup">
          {q.options.map((id) => {
            const isAnswer = id === q.phraseId;
            const show = picked !== null && (isAnswer || picked === id);
            return (
              <Pressable
                key={id}
                testID={process.env.EXPO_PUBLIC_E2E && isAnswer ? 'placement-answer' : 'placement-option'}
                disabled={picked !== null}
                onPress={() => choose(id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: picked === id }}
                style={({ pressed }) => [
                  styles.option,
                  show && isAnswer && styles.right,
                  show && !isAnswer && styles.wrong,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <Txt style={[q.mode === 'toLg' ? styles.lg : styles.meaning, show && isAnswer && { color: C.neon }]}>
                  {q.mode === 'toLg' ? PHRASES[id].lg : PHRASES[id].tr[lang]}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Button testID="placement-dont-know" kind="ghost" label={t('place.dontKnow')} onPress={() => choose(null)} disabled={picked !== null} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  body: { padding: S.lg, gap: S.lg, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  center: { alignItems: 'center', paddingTop: S.xl },
  centerText: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: S.sm, marginTop: S.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.sm, minHeight: 56, width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  stop: { minHeight: 44, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' },
  stopText: { ...F.semi, fontSize: 16, color: C.ink2 },
  options: { gap: S.md },
  option: { minHeight: 60, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: S.lg, paddingVertical: S.md, justifyContent: 'center' },
  right: { borderColor: C.neon },
  wrong: { borderColor: C.tomato },
  lg: { ...F.semi, fontSize: 21, color: C.ink },
  meaning: { ...F.body, fontSize: 18, color: C.ink },
  list: { alignSelf: 'stretch', paddingVertical: S.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
  rowN: { ...F.semi, fontSize: 15, color: C.neon, width: 24 },
});
