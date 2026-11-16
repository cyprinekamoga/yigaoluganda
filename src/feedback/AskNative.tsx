import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FormMessage } from '../account/AuthShell';
import { ACCOUNTS } from '../account/config';
import { askNativeSpeaker, type AskError } from '../account/feedback';
import { useT, type Key } from '../i18n';
import { useIsKid } from '../learners/store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { C, S } from '../ui/theme';
import { Txt } from '../ui/Txt';

const ERR: Record<AskError, Key> = {
  offline: 'auth.errNetwork',
  no_access: 'ask.errAccess',
  too_many: 'ask.errTooMany',
  signed_out: 'ask.errSignedOut',
  too_big: 'ask.errTooBig',
};

/**
 * Under Speak & compare: send the recording to a Luganda speaker, who answers with a rating
 * and a tip (shown on the Me tab). Not in a child's profile, or without accounts.
 */
export function AskNative({ phraseId, uri }: { phraseId: string; uri: string }) {
  const { t, lang } = useT();
  const kid = useIsKid();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<Key | null>(null);
  if (!ACCOUNTS || kid) return null;

  const send = async () => {
    setState('sending');
    setError(null);
    const r = await askNativeSpeaker(phraseId, uri, lang);
    if ('error' in r) {
      setState('idle');
      return setError(ERR[r.error]);
    }
    setState('sent');
  };

  return (
    <Card style={styles.card} testID="ask-native">
      <View style={styles.head}>
        <Ionicons name="people" size={20} color={C.neon} />
        <Txt variant="h3" style={{ flex: 1 }}>
          {t('ask.title')}
        </Txt>
      </View>
      {state === 'sent' ? (
        <Txt variant="body" testID="ask-sent" style={{ color: C.neon }}>
          {t('ask.sent')}
        </Txt>
      ) : (
        <>
          <Txt variant="small">{t('ask.body')}</Txt>
          <FormMessage text={error ? t(error) : null} />
          <Button testID="ask-send" kind="secondary" label={t('ask.send')} loading={state === 'sending'} onPress={send} />
          <Txt variant="caption" style={{ color: C.ink3 }}>
            {t('ask.privacy')}
          </Txt>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
});
