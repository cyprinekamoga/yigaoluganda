import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SENTENCES } from '../../content';
import { useT } from '../../i18n';
import type { Step } from '../../logic/generator';
import { fillName, normalize, optionForm } from '../../logic/text';
import { Button } from '../../ui/Button';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { SpeakerButtons } from '../SpeakerButtons';
import type { ExerciseProps } from '../types';

type BuildStepT = Extract<Step, { kind: 'build' | 'dictation' }>;

/**
 * Word Bank Sentence Builder (translate the meaning into Luganda) and
 * Audio Dictation (assemble what you hear). Tiles are Luganda only: one Luganda
 * word often equals several English words, so tiles never map word-for-word.
 */
export function BuildStep({ step, locked, name, onResult }: ExerciseProps<BuildStepT>) {
  const { t, tr } = useT();
  const sentence = SENTENCES[step.sentenceId];
  // Track tiles by index: the same word can appear twice.
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const meaning = fillName(tr(sentence.tr), name);
  const answerText = optionForm(fillName(sentence.lg, name));

  const check = () => {
    setChecked(true);
    const built = chosen.map((i) => step.tiles[i]).join(' ');
    onResult({ correct: normalize(built) === normalize(step.answer.join(' ')), answer: answerText, meaning: step.kind === 'dictation' ? meaning : undefined });
  };

  const disabled = locked || checked;
  // Test builds only: mark which bank tile is the n-th word of the answer.
  const e2eOrder = process.env.EXPO_PUBLIC_E2E ? answerOrder(step.tiles, step.answer) : null;
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="h2" accessibilityRole="header">
          {step.kind === 'dictation' ? t('lesson.dictation') : t('lesson.build')}
        </Txt>
        {step.kind === 'dictation' ? (
          <SpeakerButtons id={step.sentenceId} big autoPlay />
        ) : (
          <View style={styles.source}>
            <Txt variant="h3" testID="build-prompt">
              {meaning}
            </Txt>
          </View>
        )}

        <View style={styles.answer} accessibilityLabel={t('lesson.tapTiles')} testID="build-answer">
          {chosen.length === 0 && <Txt variant="small">{t('lesson.tapTiles')}</Txt>}
          {chosen.map((ti, pos) => (
            <Pressable
              key={`${ti}-${pos}`}
              disabled={disabled}
              onPress={() => setChosen(chosen.filter((_, j) => j !== pos))}
              accessibilityRole="button"
              accessibilityLabel={step.tiles[ti]}
              style={[styles.tile, styles.tileChosen]}
            >
              <Txt style={styles.tileText}>{step.tiles[ti]}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.bank}>
          {step.tiles.map((w, i) => {
            const used = chosen.includes(i);
            return (
              <Pressable
                key={`${w}-${i}`}
                testID={e2eOrder && e2eOrder[i] !== undefined ? `tile-ans-${e2eOrder[i]}` : `tile-${w}`}
                disabled={used || disabled}
                onPress={() => setChosen([...chosen, i])}
                accessibilityRole="button"
                accessibilityLabel={w}
                accessibilityState={{ disabled: used }}
                style={({ pressed }) => [styles.tile, used && styles.tileUsed, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <Txt style={[styles.tileText, used && { color: 'transparent' }]}>{w}</Txt>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Footer>
        <Button testID="check" label={t('common.check')} disabled={chosen.length === 0 || checked} onPress={check} />
      </Footer>
    </View>
  );
}

function answerOrder(tiles: string[], answer: string[]): Record<number, number> {
  const out: Record<number, number> = {};
  const used = new Set<number>();
  answer.forEach((w, pos) => {
    const i = tiles.findIndex((t, k) => !used.has(k) && t === w);
    if (i >= 0) {
      used.add(i);
      out[i] = pos;
    }
  });
  return out;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  source: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.line },
  answer: { minHeight: 120, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: S.sm, paddingVertical: S.md, borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.line, borderStyle: 'dashed' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  tile: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderRadius: R.md, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, borderBottomWidth: 4 },
  tileChosen: { borderColor: C.ink, borderBottomWidth: 2 },
  tileUsed: { backgroundColor: C.paperDeep, borderColor: C.paperDeep },
  tileText: { fontFamily: F.semi, fontSize: 18, color: C.ink },
});
