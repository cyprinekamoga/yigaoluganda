import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Ngaali } from '../ui/Ngaali';
import { Sheet } from '../ui/Sheet';
import { C, F, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { gatePasses, gateQuestion, numberWord, type GateQuestion } from './gate';
import { useIsKid } from './store';

/** "Ask a grown-up": a times question in words before settings, payments or leaving a child's profile. */
export function ParentGate({ visible, onPass, onClose }: { visible: boolean; onPass: () => void; onClose: () => void }) {
  const { t, lang } = useT();
  const [q, setQ] = useState<GateQuestion>(() => gateQuestion());
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);

  const close = () => {
    setTyped('');
    setWrong(false);
    setQ(gateQuestion());
    onClose();
  };
  const submit = () => {
    if (gatePasses(q, typed)) {
      setTyped('');
      setWrong(false);
      setQ(gateQuestion());
      onPass();
    } else {
      setWrong(true);
      setTyped('');
      setQ(gateQuestion());
    }
  };

  return (
    <Sheet visible={visible} onClose={close} testID="parent-gate">
      <View style={styles.head}>
        <Ngaali mood="think" size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h2">{t('gate.title')}</Txt>
          <Txt variant="body" style={{ color: C.ink2 }}>
            {t('gate.body')}
          </Txt>
        </View>
      </View>
      <Txt variant="h3" testID="gate-question" accessibilityRole="header">
        {t('gate.question', { a: numberWord(q.a, lang), b: numberWord(q.b, lang) })}
      </Txt>
      <TextInput
        testID="gate-answer"
        accessibilityLabel={t('gate.answer')}
        placeholder={t('gate.answer')}
        placeholderTextColor={C.ink3}
        value={typed}
        onChangeText={(v) => setTyped(v.replace(/\D/g, '').slice(0, 3))}
        keyboardType="number-pad"
        inputMode="numeric"
        returnKeyType="go"
        onSubmitEditing={submit}
        style={styles.input}
        maxLength={3}
      />
      {wrong ? (
        <Txt variant="body" style={styles.wrong} accessibilityLiveRegion="polite">
          {t('gate.wrong')}
        </Txt>
      ) : null}
      <Button testID="gate-submit" label={t('common.continue')} onPress={submit} disabled={!typed} />
      <Button kind="ghost" label={t('common.cancel')} onPress={close} />
    </Sheet>
  );
}

/**
 * Runs `action` straight away for grown-ups, and after the grown-up check in a child's profile.
 * Returns the gate to render and a function that asks for it.
 */
export function useGrownUpCheck(): { ask: (action: () => void) => void; gate: React.ReactNode } {
  const kid = useIsKid();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const ask = (action: () => void) => {
    if (!kid) action();
    else setPending(() => action);
  };
  const gate = (
    <ParentGate
      visible={pending !== null}
      onClose={() => setPending(null)}
      onPass={() => {
        const run = pending;
        setPending(null);
        run?.();
      }}
    />
  );
  return { ask, gate };
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
  input: { ...F.heading, fontSize: 28, color: C.ink, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 60, textAlign: 'center', outlineWidth: 0 },
  wrong: { color: C.tomatoDeep },
});
