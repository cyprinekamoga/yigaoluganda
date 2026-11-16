import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT, type Key } from '../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextField } from '../ui/TextField';
import { C, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { joinClass } from './actions';
import { FormMessage } from './AuthShell';
import { cleanClassCode, forgetClassCode, useClassCode } from './classCode';

/**
 * On the plan page: "Have a class code from your teacher?". A code from a teacher's link is used
 * straight away, so a student never sees the payment page.
 */
export function JoinClassCard() {
  const { t } = useT();
  const pending = useClassCode();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);

  const join = async (raw: string) => {
    const clean = cleanClassCode(raw);
    if (!clean) return setError('class.errNoClass');
    setBusy(true);
    setError(null);
    const r = await joinClass(clean);
    setBusy(false);
    forgetClassCode();
    // Joined: the course unlocks and the app moves on by itself.
    if (!r.ok) {
      setOpen(true);
      setCode(clean);
      setError(r.error);
    }
  };

  // A code from a teacher's link is used once, when it arrives.
  useEffect(() => {
    if (!pending) return;
    let live = true;
    joinClass(pending).then((r) => {
      forgetClassCode();
      // Joined: the course unlocks and the app moves on by itself.
      if (!live || r.ok) return;
      setOpen(true);
      setCode(pending);
      setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [pending]);

  if (pending) {
    return (
      <Card style={styles.card} testID="class-joining">
        <Txt variant="h3">{t('class.joining')}</Txt>
      </Card>
    );
  }

  return (
    <Card style={styles.card} testID="class-card">
      {open ? (
        <View style={{ gap: S.md }}>
          <TextField testID="class-code" label={t('class.codeLabel')} hint={t('class.codeHint')} value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} onSubmitEditing={() => join(code)} />
          <FormMessage text={error ? t(error) : null} />
          <Button testID="class-join" label={t('class.join')} loading={busy} disabled={!code.trim()} onPress={() => join(code)} />
        </View>
      ) : (
        <Button testID="class-open" kind="ghost" label={t('class.haveCode')} onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm, borderRadius: R.xl, borderColor: C.line },
  banner: { backgroundColor: C.neon, borderRadius: R.md, padding: S.md },
});

/** On sign-up: "Joining your class: nothing to pay." */
export function ClassBanner() {
  const { t } = useT();
  const code = useClassCode();
  if (!code) return null;
  return (
    <View style={styles.banner} testID="class-banner">
      <Txt variant="strong" style={{ color: C.onNeon }}>
        {t('class.banner', { code })}
      </Txt>
    </View>
  );
}
