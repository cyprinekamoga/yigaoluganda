import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { hasAudio, playClip } from '../../audio/engine';
import { matchFeedback, wrongFeedback } from '../../audio/feedback';
import { PHRASES } from '../../content';
import { useT } from '../../i18n';
import type { Step } from '../../logic/generator';
import { hashString, makeRng, shuffle } from '../../logic/rng';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { StepScroll } from '../StepScroll';
import type { ExerciseProps } from '../types';

type MatchStepT = Extract<Step, { kind: 'match' }>;
type Side = 'lg' | 'tr';

/**
 * Join the pairs: tap a Luganda word, then its meaning. Each joined pair leaves the columns
 * and is threaded onto the list below, like a bead onto a string.
 */
export function MatchStep({ step, locked, onResult, onMistake, after, footer }: ExerciseProps<MatchStepT>) {
  const { t, tr } = useT();
  const rng = useMemo(() => makeRng(hashString(step.phraseIds.join())), [step.phraseIds]);
  const left = useMemo(() => shuffle(step.phraseIds, rng), [step.phraseIds, rng]);
  const right = useMemo(() => shuffle(step.phraseIds, rng), [step.phraseIds, rng]);
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [bad, setBad] = useState<{ lg: string; tr: string } | null>(null);
  const mistakes = useRef(0);
  const [shake] = useState(() => new Animated.Value(0));

  const tap = (side: Side, id: string) => {
    if (locked || matched.includes(id)) return;
    if (side === 'lg' && hasAudio(id)) playClip(id);
    if (!sel || sel.side === side) {
      setSel({ side, id });
      return;
    }
    if (sel.id === id) {
      matchFeedback();
      const next = [...matched, id];
      setMatched(next);
      setSel(null);
      if (next.length === step.phraseIds.length) {
        setTimeout(() => onResult({ correct: mistakes.current === 0, title: mistakes.current === 0 ? t('fb.matched') : t('fb.matchedMistakes') }), 250);
      }
      return;
    }
    // Wrong pair
    wrongFeedback();
    mistakes.current += 1;
    onMistake();
    setBad(side === 'lg' ? { lg: id, tr: sel.id } : { lg: sel.id, tr: id });
    setSel(null);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: false }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: false }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: false }),
    ]).start(() => setBad(null));
  };

  const card = (side: Side, id: string) => {
    if (matched.includes(id)) return null;
    const isSel = sel?.side === side && sel.id === id;
    const isBad = bad?.[side] === id;
    const label = side === 'lg' ? PHRASES[id].lg : tr(PHRASES[id].tr);
    return (
      <Animated.View key={`${side}-${id}`} style={isBad ? { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] } : undefined}>
        <Pressable
          testID={`match-${side}-${id}`}
          disabled={locked}
          onPress={() => tap(side, id)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSel }}
          accessibilityLabel={label}
          style={[styles.card, isSel && styles.sel, isBad && styles.bad]}
        >
          <Txt style={side === 'lg' ? styles.lg : styles.tr} numberOfLines={3}>
            {label}
          </Txt>
        </Pressable>
      </Animated.View>
    );
  };

  const allJoined = matched.length === step.phraseIds.length;
  return (
    <View style={styles.fill}>
      <StepScroll contentContainerStyle={styles.body} after={after}>
        <Txt variant="h2" accessibilityRole="header">
          {t('lesson.match')}
        </Txt>
        {!allJoined && (
          <View style={styles.cols}>
            <View style={styles.col}>{left.map((id) => card('lg', id))}</View>
            <View style={styles.col}>{right.map((id) => card('tr', id))}</View>
          </View>
        )}
        {matched.length > 0 && (
          <View style={styles.joined} testID="match-joined">
            <Txt variant="label">{t('lesson.paired')}</Txt>
            {matched.map((id) => (
              <View key={id} style={styles.pair} accessible accessibilityLabel={`${PHRASES[id].lg}: ${tr(PHRASES[id].tr)}`}>
                <Txt style={styles.pairLg} numberOfLines={2}>
                  {PHRASES[id].lg}
                </Txt>
                <View style={styles.thread}>
                  <View style={styles.threadLine} />
                  <View style={styles.bead} />
                  <View style={styles.threadLine} />
                </View>
                <Txt style={styles.pairTr} numberOfLines={2}>
                  {tr(PHRASES[id].tr)}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </StepScroll>
      {footer && <Footer>{footer}</Footer>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: S.xxl },
  cols: { flexDirection: 'row', gap: S.md },
  col: { flex: 1, gap: S.md },
  card: { minHeight: 72, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, padding: S.md, justifyContent: 'center' },
  sel: { borderColor: C.ink2, backgroundColor: C.paperDeep },
  bad: { borderColor: C.tomato, backgroundColor: C.tomatoSoft },
  lg: { ...F.semi, fontSize: 18, color: C.ink },
  tr: { ...F.body, fontSize: 16, color: C.ink },
  joined: { gap: S.sm },
  pair: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 52, paddingHorizontal: S.md, borderRadius: R.lg, backgroundColor: C.card },
  pairLg: { ...F.semi, fontSize: 17, color: C.neon, flex: 1 },
  pairTr: { ...F.body, fontSize: 15, color: C.ink2, flex: 1, textAlign: 'right' },
  thread: { flexDirection: 'row', alignItems: 'center', width: 44 },
  threadLine: { flex: 1, height: 2, backgroundColor: C.line },
  bead: { width: 12, height: 9, borderRadius: 6, backgroundColor: C.tomato },
});
