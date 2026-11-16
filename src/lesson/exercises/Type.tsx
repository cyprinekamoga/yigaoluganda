import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { PHRASES } from '../../content';
import { useT } from '../../i18n';
import type { Step } from '../../logic/generator';
import { optionForm } from '../../logic/text';
import { acceptedForms, gradeTyped } from '../../logic/typing';
import { Button } from '../../ui/Button';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { StepScroll } from '../StepScroll';
import type { ExerciseProps } from '../types';

type TypeStepT = Extract<Step, { kind: 'type' }>;

/**
 * Write it in Luganda: the meaning is shown and the learner types the phrase from memory.
 * A key adds ŋ (phone keyboards rarely have it; ng' works too).
 */
export function TypeStep({ step, locked, onResult, after, footer }: ExerciseProps<TypeStepT>) {
  const { t, tr } = useT();
  const p = PHRASES[step.phraseId];
  const answer = optionForm(p.lg);
  const meaning = tr(p.tr);
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const check = () => {
    if (!text.trim() || checked) return;
    setChecked(true);
    const grade = gradeTyped(text, acceptedForms(p.lg, p.variants));
    onResult({
      correct: grade === 'correct' || grade === 'typo',
      answer,
      meaning,
      hint: grade === 'length' ? t('fb.lengthHint') : grade === 'typo' ? t('type.typo', { answer }) : undefined,
    });
  };

  const addEng = () => {
    setText((v) => `${v}ŋ`);
    input.current?.focus();
  };

  return (
    <View style={styles.fill}>
      <StepScroll contentContainerStyle={styles.body} after={after}>
        <View style={{ gap: S.sm }}>
          <Txt variant="label">{t('type.title')}</Txt>
          <Txt variant="h2" accessibilityRole="header" testID="type-prompt">
            {meaning}
          </Txt>
        </View>
        <TextInput
          ref={input}
          testID="type-input"
          value={text}
          onChangeText={setText}
          editable={!locked && !checked}
          placeholder={t('type.placeholder')}
          placeholderTextColor={C.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={check}
          accessibilityLabel={t('type.a11y', { meaning })}
          accessibilityLanguage="lg"
          style={[styles.input, checked && styles.inputDone]}
        />
        <View style={styles.keys}>
          <Pressable testID="type-eng" onPress={addEng} disabled={locked || checked} accessibilityRole="button" accessibilityLabel={t('type.engA11y')} style={({ pressed }) => [styles.key, pressed && { opacity: 0.7 }]}>
            <Txt style={styles.keyText}>ŋ</Txt>
          </Pressable>
          <Txt variant="small" style={{ flex: 1 }}>
            {t('type.engHint')}
          </Txt>
        </View>
        {process.env.EXPO_PUBLIC_E2E ? (
          <Txt testID="type-expected" style={styles.hidden}>
            {answer}
          </Txt>
        ) : null}
      </StepScroll>
      <Footer>{footer ?? <Button testID="check" label={t('common.check')} disabled={!text.trim() || checked} onPress={check} />}</Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  input: { ...F.semi, fontSize: 22, letterSpacing: 0.5, color: C.ink, minHeight: 60, paddingHorizontal: S.lg, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  inputDone: { opacity: 0.8 },
  keys: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  key: { width: 52, height: 48, borderRadius: R.md, backgroundColor: C.paperDeep, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  keyText: { ...F.semi, fontSize: 22, color: C.ink },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
