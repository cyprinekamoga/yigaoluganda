import { Link } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { resendConfirmation, signUp } from '@/account/actions';
import { AuthShell, FormMessage } from '@/account/AuthShell';
import { SITE_URL } from '@/account/config';
import type { Lang } from '@/content/types';
import { useT, type Key } from '@/i18n';
import { useApp } from '@/state/store';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { PasswordField, TextField } from '@/ui/TextField';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function SignUp() {
  const { t, lang } = useT();
  const setLang = useApp((s) => s.setLang);
  const [name, setName] = useState(useApp.getState().profile?.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await signUp(name, email, password, lang);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else if (r.confirm) setSentTo(email.trim());
    // Otherwise the new session moves the app on to choosing a plan.
  };

  if (sentTo) {
    return (
      <AuthShell testID="screen-check-email" title={t('auth.checkTitle')} lead={t('auth.checkBody', { email: sentTo })} mood="correct">
        <FormMessage text={resent ? t('auth.resent') : null} tone="ok" />
        <Button
          kind="secondary"
          label={t('auth.resend')}
          onPress={async () => {
            const r = await resendConfirmation(sentTo);
            if (r.ok) setResent(true);
            else setError(r.error);
          }}
        />
        <FormMessage text={error ? t(error) : null} />
        <Link href="/sign-in" replace style={styles.link}>
          {t('auth.back')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell testID="screen-sign-up" title={t('auth.signUpTitle')} lead={t('auth.signUpLead')}>
      <View style={styles.field}>
        <Txt variant="strong">{t('auth.language')}</Txt>
        <View style={styles.seg} accessibilityRole="radiogroup">
          {(['en', 'sv'] as Lang[]).map((l) => (
            <Pressable
              key={l}
              testID={`lang-${l}`}
              onPress={() => setLang(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected: lang === l }}
              style={[styles.segBtn, lang === l && styles.segOn]}
            >
              <Txt style={[styles.segText, lang === l && { color: C.onTomato }]}>{l === 'en' ? 'English' : 'Svenska'}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      <TextField testID="signup-name" label={t('auth.name')} value={name} onChangeText={setName} maxLength={24} autoCapitalize="words" autoComplete="given-name" textContentType="givenName" />
      <TextField
        testID="signup-email"
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
        testID="signup-password"
        label={t('auth.password')}
        hint={t('auth.passwordHint')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FormMessage text={error ? t(error) : null} />
      <Button testID="signup-submit" label={t('auth.create')} onPress={submit} loading={busy} disabled={!name.trim() || !email.trim() || !password} />
      <Card style={styles.legal}>
        <Txt variant="small">{t('auth.agree')}</Txt>
        <View style={styles.legalLinks}>
          <Txt style={styles.inline} accessibilityRole="link" onPress={() => Linking.openURL(lang === 'sv' ? `${SITE_URL}/sv/villkor/` : `${SITE_URL}/terms/`)}>
            {t('auth.terms')}
          </Txt>
          <Txt style={styles.inline} accessibilityRole="link" onPress={() => Linking.openURL(lang === 'sv' ? `${SITE_URL}/sv/integritet/` : `${SITE_URL}/privacy/`)}>
            {t('auth.privacy')}
          </Txt>
        </View>
      </Card>
      <View style={styles.switch}>
        <Txt variant="body" style={{ color: C.ink2 }}>
          {t('auth.haveAccount')}
        </Txt>
        <Link href="/sign-in" replace style={styles.link} testID="go-sign-in">
          {t('auth.logIn')}
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  field: { gap: S.xs },
  seg: { flexDirection: 'row', backgroundColor: C.paperDeep, borderRadius: R.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: R.sm + 2, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.tomato },
  segText: { ...F.semi, fontSize: 15, color: C.ink },
  legal: { gap: S.xs, padding: S.md },
  legalLinks: { flexDirection: 'row', gap: S.lg },
  inline: { ...F.semi, fontSize: 14, color: C.neon, textDecorationLine: 'underline' },
  switch: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center' },
  link: { ...F.semi, fontSize: 16, color: C.neon, textAlign: 'center', paddingVertical: 6 },
});
