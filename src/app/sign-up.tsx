import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { resendConfirmation, signUp } from '@/account/actions';
import { AuthShell, FormMessage } from '@/account/AuthShell';
import { InviteBanner } from '@/account/InviteCard';
import { ClassBanner } from '@/account/JoinClass';
import { GoogleButton } from '@/account/GoogleButton';
import { SITE_URL } from '@/account/config';
import type { Lang } from '@/content/types';
import { useT, type Key } from '@/i18n';
import { suggestEmail } from '@/logic/emailTypos';
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
  // A likely typo in the address ("gmail.clm"), shown once before the account is created.
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [checkedEmail, setCheckedEmail] = useState('');
  const wait = useCountdown();

  const submit = async (address = email) => {
    const typed = address.trim();
    const guess = suggestEmail(typed);
    if (guess && checkedEmail !== typed) {
      setCheckedEmail(typed);
      setSuggestion(guess);
      return;
    }
    setSuggestion(null);
    setBusy(true);
    setError(null);
    const r = await signUp(name, typed, password, lang);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else if (r.confirm) {
      setSentTo(typed);
      wait.start(60);
    }
    // Otherwise the new session moves the app on to choosing a plan.
  };

  if (sentTo) {
    return (
      <AuthShell testID="screen-check-email" title={t('auth.checkTitle')} lead={t('auth.checkBody', { email: sentTo })} mood="correct">
        <Card style={styles.tips}>
          <Txt variant="body">• {t('auth.checkNewest')}</Txt>
          <Txt variant="body">• {t('auth.checkSpam')}</Txt>
          <Txt variant="body">• {t('auth.checkSameDevice')}</Txt>
        </Card>
        <FormMessage text={resent ? t('auth.resent') : null} tone="ok" />
        <Button
          testID="resend"
          kind="secondary"
          disabled={wait.left > 0}
          label={wait.left > 0 ? t('auth.resendIn', { n: wait.left }) : t('auth.resend')}
          onPress={async () => {
            setError(null);
            const r = await resendConfirmation(sentTo);
            wait.start(60);
            if (r.ok) setResent(true);
            else setError(r.error);
          }}
        />
        <FormMessage text={error ? t(error) : null} />
        <Button
          testID="change-email"
          kind="ghost"
          label={t('auth.changeEmail')}
          onPress={() => {
            setSentTo(null);
            setResent(false);
            setError(null);
          }}
        />
        <Link href="/sign-in" replace style={styles.link} testID="go-sign-in-confirmed">
          {t('auth.alreadyConfirmed')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell testID="screen-sign-up" title={t('auth.signUpTitle')} lead={t('auth.signUpLead')}>
      <InviteBanner />
      <ClassBanner />
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
      <GoogleButton mode="signup" />
      <TextField testID="signup-name" label={t('auth.name')} value={name} onChangeText={setName} maxLength={24} autoCapitalize="words" autoComplete="given-name" textContentType="givenName" />
      <TextField
        testID="signup-email"
        label={t('auth.email')}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setSuggestion(null);
        }}
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
        onSubmitEditing={() => submit()}
      />
      {suggestion && (
        <Card style={styles.suggest} testID="email-suggestion">
          <Txt variant="body">{t('auth.didYouMean', { email: suggestion })}</Txt>
          <View style={styles.suggestRow}>
            <Button
              small
              kind="neon"
              testID="email-suggestion-use"
              label={t('auth.useSuggestion')}
              style={{ flex: 1 }}
              onPress={() => {
                setEmail(suggestion);
                submit(suggestion);
              }}
            />
            <Button small kind="ghost" testID="email-suggestion-keep" label={t('auth.keepEmail')} onPress={() => submit(email)} />
          </View>
        </Card>
      )}
      <FormMessage text={error ? t(error) : null} />
      <Button testID="signup-submit" label={t('auth.create')} onPress={() => submit()} loading={busy} disabled={!name.trim() || !email.trim() || !password} />
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

/** Seconds left before "send again" works (Supabase allows one e-mail a minute). */
function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const id = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(id);
  }, [until, now]);
  return {
    left: Math.max(0, Math.ceil((until - now) / 1000)),
    start: (seconds: number) => {
      const t0 = Date.now();
      setNow(t0);
      setUntil(t0 + seconds * 1000);
    },
  };
}

const styles = StyleSheet.create({
  field: { gap: S.xs },
  tips: { gap: S.xs, padding: S.md },
  suggest: { gap: S.sm, padding: S.md, borderColor: C.neon, borderWidth: 1.5 },
  suggestRow: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
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
