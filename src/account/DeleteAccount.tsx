import { useState } from 'react';
import { useT, type Key } from '../i18n';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { PasswordField } from '../ui/TextField';
import { Txt } from '../ui/Txt';
import { deleteAccount } from './actions';
import { FormMessage } from './AuthShell';
import { useCaptcha } from './captcha';
import { useAccount } from './store';

/**
 * "Delete account" with a confirmation sheet. Available even without a subscription. Accounts with a
 * password type it again (with the bot test, when it is on); Google accounts need to have logged in
 * within the last 10 minutes.
 */
export function DeleteAccountButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button kind="ghost" small testID="delete-account" label={t('settings.delete')} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => !busy && setOpen(false)} testID="delete-sheet">
        {open && <DeleteForm busy={busy} setBusy={setBusy} onClose={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}

/** The sheet's content, mounted while it is open (so the bot test starts when it is needed). */
function DeleteForm({ busy, setBusy, onClose }: { busy: boolean; setBusy: (b: boolean) => void; onClose: () => void }) {
  const { t } = useT();
  const usesPassword = useAccount((s) => (s.session?.user.identities ?? []).some((i) => i.provider === 'email'));
  const captcha = useCaptcha();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Key | null>(null);
  return (
    <>
      <Txt variant="h2">{t('settings.delete')}</Txt>
      <Txt variant="body">{t('settings.deleteBody')}</Txt>
      {usesPassword ? (
        <>
          <PasswordField testID="delete-password" label={t('delete.password')} value={password} onChangeText={setPassword} autoComplete="current-password" />
          {captcha.element}
        </>
      ) : (
        <Txt variant="small">{t('delete.googleHint')}</Txt>
      )}
      <FormMessage text={error ? t(error) : null} />
      <Button
        testID="delete-confirm"
        kind="danger"
        loading={busy}
        disabled={usesPassword && (!password || captcha.waiting)}
        label={t('settings.deleteConfirm')}
        onPress={async () => {
          setBusy(true);
          setError(null);
          const r = await deleteAccount(usesPassword ? password : undefined, captcha.token);
          if (usesPassword) captcha.reset();
          setBusy(false);
          if (r.ok) onClose();
          else setError(r.error);
        }}
      />
      <Button kind="ghost" label={t('common.cancel')} onPress={onClose} disabled={busy} />
    </>
  );
}
