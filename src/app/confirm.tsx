import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { confirmFromLink } from '@/account/actions';
import { AuthShell, FormMessage } from '@/account/AuthShell';
import { useAccount } from '@/account/store';
import { useT, type Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { C, F } from '@/ui/theme';

/**
 * Opened from the sign-up and password e-mails: /confirm?token_hash=…&type=email|recovery.
 * The one-time code is used only when the person taps the button, so a mail scanner that opens
 * the link first (Gmail does) can't use it up.
 */
export default function Confirm() {
  const { t } = useT();
  const router = useRouter();
  const { token_hash: tokenHash, type } = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const kind = type === 'recovery' ? 'recovery' : type === 'email_change' ? 'email_change' : 'email';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(tokenHash ? null : 'auth.linkExpired');

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const r = await confirmFromLink(tokenHash ?? '', kind);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    // Logged in now: this page has done its job; on to choosing a new password, or to the plan.
    useAccount.setState({ confirmLink: false });
    router.replace(kind === 'recovery' ? '/reset-password' : kind === 'email_change' ? '/' : '/subscribe');
  };

  const reset = kind === 'recovery';
  const change = kind === 'email_change';
  const title = reset ? t('confirm.resetTitle') : change ? t('confirm.emailTitle') : t('confirm.title');
  const lead = reset ? t('confirm.resetLead') : change ? t('confirm.emailLead') : t('confirm.lead');
  const button = reset ? t('confirm.resetButton') : change ? t('confirm.emailButton') : t('confirm.button');
  return (
    <AuthShell testID="screen-confirm" title={title} lead={lead} mood="wave">
      <FormMessage text={error ? t(error) : null} />
      {!error || error === 'auth.errNetwork' ? (
        <Button testID="confirm-submit" label={button} onPress={confirm} loading={busy} />
      ) : (
        <Link href={reset ? '/forgot-password' : '/sign-in'} replace style={styles.link} testID="confirm-new-link">
          {reset ? t('confirm.newLink') : t('auth.logIn')}
        </Link>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { ...F.semi, fontSize: 16, color: C.neon, textAlign: 'center', paddingVertical: 6 },
});
