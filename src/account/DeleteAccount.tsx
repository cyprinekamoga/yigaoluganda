import { useState } from 'react';
import { useT, type Key } from '../i18n';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Txt } from '../ui/Txt';
import { deleteAccount } from './actions';
import { FormMessage } from './AuthShell';

/** "Delete account" with a confirmation sheet. Available even without a subscription. */
export function DeleteAccountButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  return (
    <>
      <Button kind="ghost" small testID="delete-account" label={t('settings.delete')} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => !busy && setOpen(false)} testID="delete-sheet">
        <Txt variant="h2">{t('settings.delete')}</Txt>
        <Txt variant="body">{t('settings.deleteBody')}</Txt>
        <FormMessage text={error ? t(error) : null} />
        <Button
          testID="delete-confirm"
          kind="danger"
          loading={busy}
          label={t('settings.deleteConfirm')}
          onPress={async () => {
            setBusy(true);
            setError(null);
            const r = await deleteAccount();
            setBusy(false);
            if (r.ok) setOpen(false);
            else setError(r.error);
          }}
        />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => setOpen(false)} disabled={busy} />
      </Sheet>
    </>
  );
}
