import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { signOut, startCheckout } from '@/account/actions';
import { FormMessage } from '@/account/AuthShell';
import { DeleteAccountButton } from '@/account/DeleteAccount';
import { InviteBanner } from '@/account/InviteCard';
import { JoinClassCard } from '@/account/JoinClass';
import { JoinFamilyCard } from '@/account/JoinFamily';
import { useClassCode } from '@/account/classCode';
import { forgetPlan, useFamilyCode, usePlanFromLink } from '@/account/familyCode';
import { forgetInvite, useInvite } from '@/account/invite';
import { useGrownUpCheck } from '@/learners/ParentGate';
import { useIsKid } from '@/learners/store';
import { usePrice } from '@/account/price';
import { hasAccess } from '@/account/access';
import { refreshFamily, refreshSubscriptions, useAccount } from '@/account/store';
import { useT, type Key } from '@/i18n';
import { formatMoney, isFamilyPlan, isYearlyPlan, priceLine, quote, type Plan } from '@/pricing/pricing';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Ngaali } from '@/ui/Ngaali';
import { Screen } from '@/ui/Screen';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/**
 * Choose the plan (just me or Family, monthly or yearly) and pay. There is no free trial: the
 * course unlocks once Stripe confirms the payment. Payment happens on the website only; the phone
 * apps never sell anything.
 */
export default function Subscribe() {
  const router = useRouter();
  const role = useAccount((s) => s.role);
  const { t, lang } = useT();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const email = useAccount((s) => s.session?.user.email ?? '');
  const price = usePrice();
  const linkPlan = usePlanFromLink();
  const [chosen, setChosen] = useState<Plan | null>(null);
  const plan: Plan = chosen ?? linkPlan ?? 'monthly';
  const family = isFamilyPlan(plan);
  const yearly = isYearlyPlan(plan);
  const pick = (f: boolean, y: boolean) => setChosen(f ? (y ? 'family_yearly' : 'family_monthly') : y ? 'yearly' : 'monthly');
  const q = quote(price.country, plan);
  const invited = Boolean(useInvite());
  // Just created the account with a plan chosen on the website (or a friend's invite, which is for
  // the monthly plan): go straight on to the payment page (once; not after coming back). Otherwise
  // the learner chooses here first.
  const classCode = useClassCode();
  const familyCode = useFamilyCode();
  const [autoPay] = useState(() => {
    // A student with a class code, or someone invited to a Family plan, joins instead of paying.
    const go = useAccount.getState().payNext && !status && !classCode && !familyCode && Boolean(linkPlan || invited);
    if (useAccount.getState().payNext) useAccount.setState({ payNext: false });
    return go;
  });
  const [busy, setBusy] = useState(autoPay);
  const [error, setError] = useState<Key | null>(null);
  const [waiting, setWaiting] = useState(status === 'success');

  useEffect(() => {
    if (!autoPay) return;
    startCheckout(lang, plan).then((r) => {
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
      const paid = hasAccess(subs);
      // Paid: an invite code has done its job, and a Family plan's invite code is ready to share.
      if (paid) {
        forgetInvite();
        forgetPlan();
        refreshFamily();
      }
      // A free month on a card that another account already used is ended at once (one per card).
      const refused = !paid && subs.some((s) => s.status === 'canceled' && Date.now() - Date.parse(s.created_at) < 3600_000);
      if (paid || refused || tries >= 15) {
        clearInterval(id);
        if (refused) {
          forgetInvite();
          setWaiting(false);
          setError('sub.freeMonthUsed');
        } else if (!paid) setSlow(true);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [waiting]);

  const kid = useIsKid();
  const { ask, gate } = useGrownUpCheck();

  const pay = async () => {
    setBusy(true);
    setError(null);
    const r = await startCheckout(lang, plan);
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
    }
  };
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';

  const web = Platform.OS === 'web';

  return (
    <Screen edges={['top', 'bottom']} testID="screen-subscribe" contentStyle={styles.col}>
      <View style={styles.head}>
        <Ngaali mood="wave" size={110} />
        <Txt variant="title" style={styles.center} accessibilityRole="header">
          {t('sub.title')}
        </Txt>
      </View>
      {!waiting && <InviteBanner />}

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
          <View style={styles.periods} accessibilityRole="radiogroup" accessibilityLabel={t('plan.periodA11y')}>
            {([false, true] as const).map((y) => (
              <Pressable
                key={String(y)}
                testID={y ? 'period-year' : 'period-month'}
                accessibilityRole="radio"
                accessibilityState={{ checked: yearly === y }}
                onPress={() => pick(family, y)}
                style={[styles.period, yearly === y && styles.periodOn]}
              >
                <Txt variant="strong" style={yearly === y ? { color: C.onNeon } : undefined}>
                  {t(y ? 'plan.yearly' : 'plan.monthly')}
                </Txt>
                {y && (
                  <Txt variant="caption" style={{ color: yearly ? C.onNeon : C.neon }}>
                    {t('plan.saveYearly')}
                  </Txt>
                )}
              </Pressable>
            ))}
          </View>
          <View style={{ gap: S.sm }} accessibilityRole="radiogroup">
            {([false, true] as const).map((f) => {
              const option = quote(price.country, f ? (yearly ? 'family_yearly' : 'family_monthly') : yearly ? 'yearly' : 'monthly');
              return (
                <Pressable
                  key={String(f)}
                  testID={f ? 'plan-family' : 'plan-just'}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: family === f }}
                  onPress={() => pick(f, yearly)}
                  style={[styles.option, family === f && styles.optionOn]}
                >
                  <View style={[styles.radio, family === f && styles.radioOn]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="strong">{t(f ? 'plan.family' : 'plan.just')}</Txt>
                    <Txt variant="small">{t(f ? 'plan.familyNote' : 'plan.justNote')}</Txt>
                  </View>
                  <Txt variant="strong" style={{ color: C.neon }}>
                    {formatMoney(option.total, option.currency, locale)}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <Txt style={styles.price} testID="sub-price">
            {priceLine(q, lang, yearly ? 'year' : 'month')}
          </Txt>
          {yearly && (
            <Txt variant="small" style={styles.center} testID="sub-per-month">
              {t('plan.perMonth', { price: formatMoney(Math.round(q.total / 12), q.currency, locale) })}
            </Txt>
          )}
          {yearly && invited && (
            <Txt variant="small" style={styles.center}>
              {t('plan.codesMonthly')}
            </Txt>
          )}
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

      {!waiting && <JoinFamilyCard />}

      {!waiting && <JoinClassCard />}

      <View style={styles.foot}>
        {email ? (
          <Txt variant="small" style={styles.center}>
            {t('sub.signedInAs', { email })}
          </Txt>
        ) : null}
        {role && <Button testID="open-review" kind="secondary" label={t('review.open')} onPress={() => router.push('/review')} />}
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
  periods: { flexDirection: 'row', gap: S.xs, padding: 4, borderRadius: R.pill, backgroundColor: C.paperDeep },
  period: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingVertical: 4, borderRadius: R.pill },
  periodOn: { backgroundColor: C.neon },
  option: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, minHeight: 64, borderRadius: R.lg, borderWidth: 1, borderColor: C.line },
  optionOn: { borderColor: C.neon, borderWidth: 2, backgroundColor: C.paperDeep },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.ink3 },
  radioOn: { borderColor: C.neon, backgroundColor: C.neon },
  items: { gap: S.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  bead: { width: 12, height: 9, borderRadius: 6, backgroundColor: C.tomato },
  foot: { gap: S.xs, alignItems: 'center' },
});
