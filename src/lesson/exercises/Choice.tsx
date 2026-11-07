import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PHRASES } from '../../content';
import { useT } from '../../i18n';
import type { Step } from '../../logic/generator';
import { normalize } from '../../logic/text';
import { Button } from '../../ui/Button';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { SpeakerButtons } from '../SpeakerButtons';
import type { ExerciseProps } from '../types';

type ChoiceStepT = Extract<Step, { kind: 'choice' }>;

/**
 * Sound & Vowel Matcher. With a recording: listen, then pick the spelling.
 * Without one: read the meaning, then pick the spelling. Wrong options differ only in sound length.
 */
export function ChoiceStep({ step, locked, onResult }: ExerciseProps<ChoiceStepT>) {
  const { t, tr } = useT();
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const p = PHRASES[step.phraseId];
  const meaning = tr(p.tr);

  const check = () => {
    if (!picked) return;
    setChecked(true);
    const correct = normalize(picked) === normalize(step.answer);
    const isLength = !correct && normalize(picked).replace(/(.)\1/g, '$1') === normalize(step.answer).replace(/(.)\1/g, '$1');
    onResult({ correct, answer: step.answer, meaning, hint: isLength ? t('fb.lengthHint') : undefined });
  };

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.body}>
        {step.mode === 'listen' ? (
          <View style={styles.prompt}>
            <Txt variant="h2" accessibilityRole="header">
              {t('lesson.choiceListen')}
            </Txt>
            <SpeakerButtons id={step.phraseId} big autoPlay />
          </View>
        ) : (
          <View style={styles.prompt}>
            <Txt variant="h2" accessibilityRole="header" testID="choice-prompt">
              {t('lesson.choiceRead', { meaning })}
            </Txt>
          </View>
        )}
        <View style={styles.options} accessibilityRole="radiogroup">
          {step.options.map((o) => {
            const isPicked = picked === o;
            const isAnswer = normalize(o) === normalize(step.answer);
            const showRight = checked && isAnswer;
            const showWrong = checked && isPicked && !isAnswer;
            return (
              <Pressable
                key={o}
                testID={process.env.EXPO_PUBLIC_E2E && isAnswer ? 'option-answer' : 'option'}
                disabled={locked || checked}
                onPress={() => setPicked(o)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isPicked, disabled: locked || checked }}
                style={({ pressed }) => [
                  styles.option,
                  isPicked && styles.optionPicked,
                  showRight && styles.optionRight,
                  showWrong && styles.optionWrong,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <Txt style={[styles.optionText, showRight && { color: C.leafDeep }, showWrong && { color: C.redDeep }]}>{o}</Txt>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Footer>
        <Button testID="check" label={t('common.check')} disabled={!picked || checked} onPress={check} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  prompt: { gap: S.lg, alignItems: 'flex-start' },
  options: { gap: S.md },
  option: { minHeight: 64, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: S.lg, justifyContent: 'center' },
  optionPicked: { borderColor: C.neon, backgroundColor: C.neonSoft },
  optionRight: { borderColor: C.leaf, backgroundColor: C.leafSoft },
  optionWrong: { borderColor: C.red, backgroundColor: C.redSoft },
  optionText: { ...F.semi, fontSize: 22, letterSpacing: 0.6, color: C.ink },
});
