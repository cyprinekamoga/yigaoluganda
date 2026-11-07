import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { hasAudio, playClip } from '../../audio/engine';
import { matchFeedback, wrongFeedback } from '../../audio/feedback';
import { PHRASES } from '../../content';
import { useT } from '../../i18n';
import type { Step } from '../../logic/generator';
import { hashString, makeRng, shuffle } from '../../logic/rng';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import type { ExerciseProps } from '../types';

type MatchStepT = Extract<Step, { kind: 'match' }>;
type Side = 'lg' | 'tr';

/** Tap & Match: two columns, Luganda and meanings. Tap one on each side to pair them. */
export function MatchStep({ step, locked, onResult, onMistake }: ExerciseProps<MatchStepT>) {
  const { t, tr } = useT();
  const rng = useMemo(() => makeRng(hashString(step.phraseIds.join())), [step.phraseIds]);
  const left = useMemo(() => shuffle(step.phraseIds, rng), [step.phraseIds, rng]);
  const right = useMemo(() => shuffle(step.phraseIds, rng), [step.phraseIds, rng]);
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [bad, setBad] = useState<{ lg: string; tr: string } | null>(null);
  const mistakes = useRef(0);
  const shake = useRef(new Animated.Value(0)).current;

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
    const done = matched.includes(id);
    const isSel = sel?.side === side && sel.id === id;
    const isBad = bad?.[side] === id;
    const label = side === 'lg' ? PHRASES[id].lg : tr(PHRASES[id].tr);
    return (
      <Animated.View key={`${side}-${id}`} style={isBad ? { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] } : undefined}>
        <Pressable
          testID={`match-${side}-${id}`}
          disabled={done || locked}
          onPress={() => tap(side, id)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSel, disabled: done }}
          accessibilityLabel={label}
          style={[styles.card, isSel && styles.sel, isBad && styles.bad, done && styles.done]}
        >
          <Txt style={[side === 'lg' ? styles.lg : styles.tr, done && { color: C.leafDeep }]} numberOfLines={3}>
            {label}
          </Txt>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Txt variant="h2" accessibilityRole="header">
        {t('lesson.match')}
      </Txt>
      <View style={styles.cols}>
        <View style={styles.col}>{left.map((id) => card('lg', id))}</View>
        <View style={styles.col}>{right.map((id) => card('tr', id))}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 200 },
  cols: { flexDirection: 'row', gap: S.md },
  col: { flex: 1, gap: S.md },
  card: { minHeight: 72, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, padding: S.md, justifyContent: 'center' },
  sel: { borderColor: C.ink, backgroundColor: C.sunSoft },
  bad: { borderColor: C.red, backgroundColor: C.redSoft },
  done: { borderColor: C.leafSoft, backgroundColor: C.leafSoft, opacity: 0.7 },
  lg: { ...F.semi, fontSize: 18, color: C.ink },
  tr: { ...F.body, fontSize: 16, color: C.ink },
});
