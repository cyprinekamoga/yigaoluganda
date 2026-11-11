import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SENTENCES } from '../../content';
import { useT } from '../../i18n';
import type { Step } from '../../logic/generator';
import { fillName, normalize, optionForm } from '../../logic/text';
import { Button } from '../../ui/Button';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { SpeakerButtons } from '../SpeakerButtons';
import { StepScroll } from '../StepScroll';
import type { ExerciseProps } from '../types';

type BuildStepT = Extract<Step, { kind: 'build' | 'dictation' }>;

/**
 * Word Bank Sentence Builder (translate the meaning into Luganda) and
 * Audio Dictation (assemble what you hear). Tiles are Luganda only: one Luganda
 * word often equals several English words, so tiles never map word-for-word.
 */
export function BuildStep({ step, locked, name, onResult, after, footer }: ExerciseProps<BuildStepT>) {
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
      <StepScroll contentContainerStyle={styles.body} after={after}>
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

        {/* The words are written on a line, like a sentence in an exercise book. */}
        <View style={styles.answer} accessibilityLabel={t('lesson.tapTiles')} testID="build-answer">
          {chosen.length === 0 && <Txt variant="small" style={styles.placeholder}>{t('lesson.tapTiles')}</Txt>}
          {chosen.map((ti, pos) => (
            <Pressable
              key={`${ti}-${pos}`}
              disabled={disabled}
              onPress={() => setChosen(chosen.filter((_, j) => j !== pos))}
              accessibilityRole="button"
              accessibilityLabel={step.tiles[ti]}
              style={styles.written}
            >
              <Txt style={styles.writtenText}>{step.tiles[ti]}</Txt>
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
      </StepScroll>
      <Footer>{footer ?? <Button testID="check" label={t('common.check')} disabled={chosen.length === 0 || checked} onPress={check} />}</Footer>
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
  answer: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', alignContent: 'flex-end', columnGap: S.md, rowGap: S.sm, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: C.ink3 },
  placeholder: { color: C.ink3, paddingBottom: 4 },
  written: { minHeight: 44, justifyContent: 'flex-end', paddingHorizontal: 2 },
  writtenText: { ...F.semi, fontSize: 24, color: C.neon },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  tile: { minHeight: 46, paddingHorizontal: 16, justifyContent: 'center', borderRadius: R.pill, backgroundColor: C.paperDeep },
  tileUsed: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed' },
  tileText: { ...F.semi, fontSize: 18, color: C.ink },
});
