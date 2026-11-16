import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT, type Key } from '../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextField } from '../ui/TextField';
import { C, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { joinFamily } from './actions';
import { FormMessage } from './AuthShell';
import { forgetFamilyCode, useFamilyCode } from './familyCode';
import { cleanEightCode } from './linkCode';

/**
 * On the plan page: "Have a family invite code?". A code from the payer's invite link is used
 * straight away, so the invited person never sees the payment page.
 */
export function JoinFamilyCard() {
  const { t } = useT();
  const pending = useFamilyCode();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);

  const join = async (raw: string) => {
    const clean = cleanEightCode(raw);
    if (!clean) return setError('family.errNoFamily');
    setBusy(true);
    setError(null);
    const r = await joinFamily(clean);
    setBusy(false);
    forgetFamilyCode();
    // Joined: the course unlocks and the app moves on by itself.
    if (!r.ok) {
      setOpen(true);
      setCode(clean);
      setError(r.error);
    }
  };

  // A code from an invite link is used once, when it arrives.
  useEffect(() => {
    if (!pending) return;
    let live = true;
    joinFamily(pending).then((r) => {
      forgetFamilyCode();
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
      <Card style={styles.card} testID="family-joining">
        <Txt variant="h3">{t('family.joining')}</Txt>
      </Card>
    );
  }

  return (
    <Card style={styles.card} testID="family-join-card">
      {open ? (
        <View style={{ gap: S.md }}>
          <TextField testID="family-code-input" label={t('family.codeLabel')} hint={t('family.codeHint')} value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} onSubmitEditing={() => join(code)} />
          <FormMessage text={error ? t(error) : null} />
          <Button testID="family-join" label={t('family.join')} loading={busy} disabled={!code.trim()} onPress={() => join(code)} />
        </View>
      ) : (
        <Button testID="family-open" kind="ghost" label={t('family.haveCode')} onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

/** On sign-up: "Joining a Family plan: nothing to pay." */
export function FamilyBanner() {
  const { t } = useT();
  const code = useFamilyCode();
  if (!code) return null;
  return (
    <View style={styles.banner} testID="family-banner">
      <Txt variant="strong" style={{ color: C.onNeon }}>
        {t('family.banner', { code })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm, borderRadius: R.xl, borderColor: C.line },
  banner: { backgroundColor: C.neon, borderRadius: R.md, padding: S.md },
});
