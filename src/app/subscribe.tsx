import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { signOut, startCheckout } from '@/account/actions';
import { FormMessage } from '@/account/AuthShell';
import { DeleteAccountButton } from '@/account/DeleteAccount';
import { useGrownUpCheck } from '@/learners/ParentGate';
import { useIsKid } from '@/learners/store';
import { usePrice } from '@/account/price';
import { refreshSubscriptions, useAccount } from '@/account/store';
import { useT, type Key } from '@/i18n';
import { priceLine } from '@/pricing/pricing';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Ngaali } from '@/ui/Ngaali';
import { Screen } from '@/ui/Screen';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/**
 * Choose the plan and pay. There is no free trial: the course unlocks once Stripe confirms the
 * payment. Payment happens on the website only; the phone apps never sell anything.
 */
export default function Subscribe() {
  const { t, lang } = useT();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const email = useAccount((s) => s.session?.user.email ?? '');
  const price = usePrice();
  // Just created the account: go straight on to the payment page (once; not after coming back).
  const [autoPay] = useState(() => {
    const go = useAccount.getState().payNext && !status;
    if (useAccount.getState().payNext) useAccount.setState({ payNext: false });
    return go;
  });
  const [busy, setBusy] = useState(autoPay);
  const [error, setError] = useState<Key | null>(null);
  const [waiting, setWaiting] = useState(status === 'success');

  useEffect(() => {
    if (!autoPay) return;
    startCheckout(lang).then((r) => {
      if (!r.ok) {
        setError(r.error);
        setBusy(false);
      }
    });
    // Runs once, when the screen opens after sign-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPay]);
  const [slow, setSlow] = useState(false);

  // Back from Stripe: the webhook unlocks the course within seconds; check until it has.
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      const subs = await refreshSubscriptions();
      if (subs.length || tries >= 15) {
        clearInterval(id);
        if (!subs.length) setSlow(true);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [waiting]);

  const kid = useIsKid();
  const { ask, gate } = useGrownUpCheck();

  const pay = async () => {
    setBusy(true);
    setError(null);
    const r = await startCheckout(lang);
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
    }
  };

  const web = Platform.OS === 'web';

  return (
    <Screen edges={['top', 'bottom']} testID="screen-subscribe" contentStyle={styles.col}>
      <View style={styles.head}>
        <Ngaali mood="wave" size={110} />
        <Txt variant="title" style={styles.center} accessibilityRole="header">
          {t('sub.title')}
        </Txt>
      </View>

      {waiting ? (
        <Card style={styles.card}>
          {!slow && <ActivityIndicator color={C.neon} />}
          <Txt variant="h3" style={styles.center} testID="sub-waiting">
            {slow ? t('sub.slow') : t('sub.waiting')}
          </Txt>
          {slow && (
            <Button
              kind="secondary"
              label={t('sub.checkAgain')}
              onPress={() => {
                setSlow(false);
                setWaiting(false);
                setTimeout(() => setWaiting(true), 0);
              }}
            />
          )}
        </Card>
      ) : web ? (
        <Card style={styles.card}>
          <Txt variant="body" style={[styles.center, { color: C.ink2 }]}>
            {t('sub.lead')}
          </Txt>
          <Txt style={styles.price} testID="sub-price">
            {priceLine(price, lang)}
          </Txt>
          <View style={styles.items}>
            {(['sub.item1', 'sub.item2', 'sub.item3', 'sub.item4'] as const).map((k) => (
              <View key={k} style={styles.item}>
                <View style={styles.bead} />
                <Txt variant="body" style={{ flex: 1 }}>
                  {t(k)}
                </Txt>
              </View>
            ))}
          </View>
          {status === 'cancelled' && <FormMessage text={t('sub.cancelled')} tone="ok" />}
          <FormMessage text={error ? t(error) : null} />
          {autoPay && busy ? <FormMessage text={t('sub.redirecting')} tone="ok" /> : null}
          <Button testID="sub-pay" label={t('sub.pay')} onPress={() => ask(pay)} loading={busy} />
          <Txt variant="strong" style={styles.center}>
            {t('sub.web')}
          </Txt>
          <Txt variant="small" style={styles.center}>
            {t('sub.small')}
          </Txt>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Txt variant="body" style={styles.center}>
            {t('sub.none')}
          </Txt>
        </Card>
      )}

      <View style={styles.foot}>
        {email ? (
          <Txt variant="small" style={styles.center}>
            {t('sub.signedInAs', { email })}
          </Txt>
        ) : null}
        <Button testID="sub-logout" kind="ghost" label={t('sub.logOut')} onPress={() => signOut()} />
        {!kid && <DeleteAccountButton />}
        {gate}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  col: { paddingTop: S.lg, gap: S.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  head: { alignItems: 'center', gap: S.sm },
  center: { textAlign: 'center' },
  card: { gap: S.md, padding: S.xl, borderColor: C.neon, borderWidth: 2, borderRadius: R.xl },
  price: { ...F.heading, fontSize: 28, lineHeight: 34, color: C.neon, textAlign: 'center' },
  items: { gap: S.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  bead: { width: 12, height: 9, borderRadius: 6, backgroundColor: C.tomato },
  foot: { gap: S.xs, alignItems: 'center' },
});
