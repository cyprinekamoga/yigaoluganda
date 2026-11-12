import { useRouter } from 'expo-router';
import { useState } from 'react';
import { updatePassword } from '@/account/actions';
import { AuthShell, FormMessage } from '@/account/AuthShell';
import { useT, type Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { PasswordField } from '@/ui/TextField';

/** Opened from the password-reset e-mail, which has already logged the user in. */
export default function ResetPassword() {
  const { t } = useT();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await updatePassword(password);
    setBusy(false);
    if (r.ok) router.replace('/');
    else setError(r.error);
  };

  return (
    <AuthShell testID="screen-reset" title={t('auth.resetTitle')} mood="idle">
      <PasswordField
        testID="reset-password"
        label={t('auth.newPassword')}
        hint={t('auth.passwordHint')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FormMessage text={error ? t(error) : null} />
      <Button testID="reset-submit" label={t('auth.save')} onPress={submit} loading={busy} disabled={password.length < 8} />
    </AuthShell>
  );
}
