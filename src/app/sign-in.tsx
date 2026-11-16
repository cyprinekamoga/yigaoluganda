import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { resendConfirmation, signIn } from '@/account/actions';
import { AuthShell, FormMessage } from '@/account/AuthShell';
import { useT, type Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { PasswordField, TextField } from '@/ui/TextField';
import { C, F } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function SignIn() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <AuthShell testID="screen-sign-in" title={t('auth.signInTitle')} mood="idle">
      <TextField
        testID="signin-email"
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <PasswordField
        testID="signin-password"
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FormMessage text={error ? t(error) : null} />
      {/* Not confirmed yet: send a fresh link from here (the newest e-mail is the one that works). */}
      {error === 'auth.errConfirm' && (
        <>
          <FormMessage text={resent ? t('auth.resentNewest') : null} tone="ok" />
          <Button
            testID="signin-resend"
            kind="secondary"
            label={t('auth.resend')}
            onPress={async () => {
              const r = await resendConfirmation(email);
              if (r.ok) setResent(true);
              else setError(r.error);
            }}
          />
        </>
      )}
      <Button testID="signin-submit" label={t('auth.logIn')} onPress={submit} loading={busy} disabled={!email.trim() || !password} />
      <Link href="/forgot-password" style={styles.link} testID="go-forgot">
        {t('auth.forgot')}
      </Link>
      <View style={styles.switch}>
        <Txt variant="body" style={{ color: C.ink2 }}>
          {t('auth.newHere')}
        </Txt>
        <Link href="/sign-up" replace style={styles.link} testID="go-sign-up">
          {t('auth.createLink')}
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { ...F.semi, fontSize: 16, color: C.neon, textAlign: 'center', paddingVertical: 6 },
  switch: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center' },
});
