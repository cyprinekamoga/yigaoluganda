import { useState } from 'react';
import { View } from 'react-native';
import { useT, type Key } from '../i18n';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { TextField } from '../ui/TextField';
import { S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { changeEmail } from './actions';
import { FormMessage } from './AuthShell';
import { collectMyData } from './exportData';
import { saveTextFile } from './saveFile';
import { useAccount } from './store';

/** Settings: move the account to a new e-mail address (accounts with a password; Google accounts follow Google). */
export function ChangeEmailButton() {
  const { t } = useT();
  const usesPassword = useAccount((s) => (s.session?.user.identities ?? []).some((i) => i.provider === 'email'));
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ key: Key; ok: boolean; email?: string } | null>(null);
  if (!usesPassword) return null;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await changeEmail(email);
    setBusy(false);
    setMsg(r.ok ? { key: 'email.sent', ok: true, email: email.trim() } : { key: r.error, ok: false });
  };

  return (
    <>
      <Button kind="secondary" testID="change-email" label={t('email.change')} onPress={() => (setOpen(true), setMsg(null), setEmail(''))} />
      <Sheet visible={open} onClose={() => !busy && setOpen(false)} testID="email-sheet">
        <Txt variant="h2">{t('email.change')}</Txt>
        {msg?.ok ? (
          <View style={{ gap: S.md }}>
            <FormMessage text={t('email.sent', { email: msg.email ?? '' })} tone="ok" />
            <Button label={t('common.close')} onPress={() => setOpen(false)} />
          </View>
        ) : (
          <View style={{ gap: S.md }}>
            <TextField
              testID="new-email"
              label={t('email.new')}
              hint={t('email.hint')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              onSubmitEditing={save}
            />
            <FormMessage text={msg ? t(msg.key) : null} />
            <Button testID="email-save" label={t('email.save')} disabled={!email.includes('@')} loading={busy} onPress={save} />
            <Button kind="ghost" label={t('common.cancel')} onPress={() => setOpen(false)} disabled={busy} />
          </View>
        )}
      </Sheet>
    </>
  );
}

/** Settings: everything the account holds, as a file. */
export function DownloadDataButton() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const download = async () => {
    setBusy(true);
    setError(false);
    const json = await collectMyData();
    const ok = json ? await saveTextFile(`yiga-oluganda-data-${new Date().toISOString().slice(0, 10)}.json`, json) : false;
    setBusy(false);
    setError(!ok);
  };
  return (
    <View style={{ gap: S.xs }}>
      <Button kind="secondary" testID="download-data" label={t('data.download')} loading={busy} onPress={download} />
      <Txt variant="small">{t('data.hint')}</Txt>
      <FormMessage text={error ? t('auth.errNetwork') : null} />
    </View>
  );
}
