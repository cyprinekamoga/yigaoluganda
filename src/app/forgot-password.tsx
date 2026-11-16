import { Link } from 'expo-router';
import { useCaptcha } from '@/account/captcha';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { sendPasswordReset } from '@/account/actions';
import { AuthShell, FormMessage } from '@/account/AuthShell';
import { useT, type Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { C, F } from '@/ui/theme';

export default function ForgotPassword() {
  const captcha = useCaptcha();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await sendPasswordReset(email, captcha.token);
    captcha.reset();
    setBusy(false);
    if (r.ok) setSent(email.trim());
    else setError(r.error);
  };

  return (
    <AuthShell testID="screen-forgot" title={t('auth.forgotTitle')} lead={t('auth.forgotLead')} mood="think">
      <TextField
        testID="forgot-email"
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <FormMessage text={error ? t(error) : null} />
      <FormMessage text={sent ? t('auth.resetSent', { email: sent }) : null} tone="ok" />
      {captcha.element}
      <Button testID="forgot-submit" label={t('auth.sendLink')} onPress={submit} loading={busy} disabled={!email.trim() || captcha.waiting} />
      <Link href="/sign-in" replace style={styles.link}>
        {t('auth.back')}
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { ...F.semi, fontSize: 16, color: C.neon, textAlign: 'center', paddingVertical: 6 },
});
