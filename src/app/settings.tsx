import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { currentSubscription, subscriptionState, withdrawalDaysLeft } from '@/account/access';
import { deleteAccount, openBillingPortal, signOut, withdraw } from '@/account/actions';
import { FormMessage } from '@/account/AuthShell';
import { ACCOUNTS, SITE_URL } from '@/account/config';
import { useAccount } from '@/account/store';
import { ReminderSettings } from '@/reminders/ReminderSettings';
import type { Lang } from '@/content/types';
import { useT, type Key } from '@/i18n';
import { useApp } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/** react-native-web paints the 'on' thumb teal unless told otherwise. */
const WEB_SWITCH = { activeThumbColor: C.ink } as object;

export default function Settings() {
  const { t, lang } = useT();
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const setLang = useApp((s) => s.setLang);
  const setName = useApp((s) => s.setName);
  const setSetting = useApp((s) => s.setSetting);
  const reset = useApp((s) => s.reset);
  const [name, setLocalName] = useState(profile?.name ?? '');
  const [confirm, setConfirm] = useState(false);
  const [focused, setFocused] = useState(false);
  const email = useAccount((s) => s.session?.user.email ?? '');
  const sub = currentSubscription(useAccount((s) => s.subscriptions));
  const [sheet, setSheet] = useState<'withdraw' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  // Read the clock once per visit; the withdrawal window is counted in whole days.
  const [now] = useState(() => Date.now());
  const state = subscriptionState(sub);
  const daysLeft = withdrawalDaysLeft(sub, now);
  const date = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const run = async (action: () => Promise<{ ok: true } | { ok: false; error: Key }>) => {
    setBusy(true);
    setError(null);
    const r = await action();
    setBusy(false);
    if (!r.ok) setError(r.error);
    return r.ok;
  };

  const saveName = () => {
    if (name.trim()) setName(name);
    else setLocalName(profile?.name ?? '');
  };

  return (
    <Screen header={<BackBar title={t('settings.title')} />} testID="screen-settings">
      <View style={styles.section}>
        <Txt variant="label">{t('settings.language')}</Txt>
        <View style={styles.seg} accessibilityRole="radiogroup">
          {(['en', 'sv'] as Lang[]).map((l) => (
            <Pressable
              key={l}
              testID={`settings-lang-${l}`}
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

      <View style={styles.section}>
        <Txt variant="label" nativeID="settings-name">
          {t('settings.name')}
        </Txt>
        <TextInput
          testID="settings-name"
          accessibilityLabel={t('settings.name')}
          value={name}
          onChangeText={setLocalName}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            saveName();
          }}
          onSubmitEditing={saveName}
          maxLength={24}
          style={[styles.input, focused && { borderColor: C.neon }]}
          autoCorrect={false}
        />
      </View>

      <Card style={{ gap: S.md }}>
        <View style={styles.switchRow}>
          <Txt variant="strong" style={{ flex: 1 }}>
            {t('settings.sfx')}
          </Txt>
          <Switch
            accessibilityLabel={t('settings.sfx')}
            value={settings.sfx}
            onValueChange={(v) => setSetting('sfx', v)}
            trackColor={{ true: C.tomato, false: C.line }}
            thumbColor={C.ink}
            {...WEB_SWITCH}
          />
        </View>
        <View style={styles.switchRow}>
          <Txt variant="strong" style={{ flex: 1 }}>
            {t('settings.haptics')}
          </Txt>
          <Switch
            accessibilityLabel={t('settings.haptics')}
            value={settings.haptics}
            onValueChange={(v) => setSetting('haptics', v)}
            trackColor={{ true: C.tomato, false: C.line }}
            thumbColor={C.ink}
            {...WEB_SWITCH}
          />
        </View>
      </Card>

      <ReminderSettings />

      {ACCOUNTS && (
        <View style={styles.section} testID="settings-account">
          <Txt variant="label">{t('settings.subscription')}</Txt>
          <Card style={{ gap: S.md }}>
            {state !== 'none' && (
              <Txt variant="strong" testID="sub-state" style={state === 'past_due' ? { color: C.tomatoDeep } : undefined}>
                {state === 'active' ? t('settings.subActive', { date }) : state === 'ending' ? t('settings.subEnding', { date }) : t('settings.subPastDue')}
              </Txt>
            )}
            <Button kind="secondary" testID="sub-manage" label={t('settings.manage')} accessibilityHint={t('settings.manageHint')} onPress={() => run(() => openBillingPortal(lang))} />
            <Txt variant="small">{t('settings.manageHint')}</Txt>
            {daysLeft > 0 && (
              <>
                <Button kind="ghost" testID="sub-withdraw" label={t('settings.withdraw')} onPress={() => setSheet('withdraw')} />
                <Txt variant="small">{t('settings.withdrawHint', { n: daysLeft })}</Txt>
              </>
            )}
            <FormMessage text={error && !sheet ? t(error) : null} />
          </Card>

          <Txt variant="label" style={{ marginTop: S.sm }}>
            {t('settings.account')}
          </Txt>
          <Card style={{ gap: S.md }}>
            <View>
              <Txt variant="small">{t('settings.email')}</Txt>
              <Txt variant="strong" testID="account-email">
                {email}
              </Txt>
            </View>
            <Button kind="secondary" testID="logout" label={t('settings.logOut')} onPress={() => signOut()} />
            <Button kind="ghost" testID="delete-account" label={t('settings.delete')} onPress={() => setSheet('delete')} />
          </Card>
        </View>
      )}

      <Card style={{ gap: S.sm }}>
        <Txt variant="h3">{t('settings.about')}</Txt>
        <Txt variant="body">{t('settings.aboutBody')}</Txt>
        <Txt variant="h3" style={{ marginTop: S.sm }}>
          {t('settings.privacy')}
        </Txt>
        <Txt variant="body">{ACCOUNTS ? t('settings.privacyCloud') : t('settings.privacyBody')}</Txt>
        <Txt style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(lang === 'sv' ? `${SITE_URL}/sv/villkor/` : `${SITE_URL}/terms/`)}>
          {t('settings.legal')}
        </Txt>
        <Txt variant="small" style={{ marginTop: S.sm }}>
          {t('settings.version', { v: Constants.expoConfig?.version ?? '2.0.0' })}
        </Txt>
      </Card>

      <Button testID="reset" kind="secondary" label={t('settings.reset')} onPress={() => setConfirm(true)} />

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Txt variant="h2">{t('settings.reset')}</Txt>
        <Txt variant="body">{t('settings.resetBody')}</Txt>
        <Button
          testID="reset-confirm"
          kind="danger"
          label={t('settings.resetConfirm')}
          onPress={() => {
            setConfirm(false);
            // With an account, the name and language belong to the account and are kept.
            const keep = profile;
            reset();
            if (ACCOUNTS && keep) useApp.setState({ profile: keep });
            router.replace(ACCOUNTS ? '/' : '/onboarding');
          }}
        />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => setConfirm(false)} />
      </Sheet>

      <Sheet visible={sheet !== null} onClose={() => !busy && setSheet(null)} testID="account-sheet">
        <Txt variant="h2">{sheet === 'withdraw' ? t('settings.withdraw') : t('settings.delete')}</Txt>
        <Txt variant="body">{sheet === 'withdraw' ? t('settings.withdrawBody') : t('settings.deleteBody')}</Txt>
        <FormMessage text={error && sheet ? t(error) : null} />
        <Button
          testID="account-confirm"
          kind="danger"
          loading={busy}
          label={sheet === 'withdraw' ? t('settings.withdrawConfirm') : t('settings.deleteConfirm')}
          onPress={async () => {
            const ok = await run(sheet === 'withdraw' ? withdraw : deleteAccount);
            if (ok) setSheet(null);
          }}
        />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => setSheet(null)} disabled={busy} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.sm },
  seg: { flexDirection: 'row', backgroundColor: C.paperDeep, borderRadius: R.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: R.sm + 2, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.tomato },
  segText: { ...F.semi, fontSize: 15, color: C.ink },
  input: { ...F.medium, fontSize: 17, color: C.ink, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 52, outlineWidth: 0 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 },
  link: { ...F.semi, fontSize: 15, color: C.neon, textDecorationLine: 'underline', marginTop: S.xs },
});
