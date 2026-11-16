import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { useT, type Key } from '../i18n';
import { useIsKid } from '../learners/store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Sheet } from '../ui/Sheet';
import { C, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { hasAccess, paysForFamily } from './access';
import { joinFamily, leaveFamily, removeFamilyMember } from './actions';
import { FormMessage } from './AuthShell';
import { ACCOUNTS } from './config';
import { forgetFamilyCode, useFamilyCode } from './familyCode';
import { familyLink } from './familyLink';
import { refreshFamily, useAccount } from './store';

/**
 * On the Me tab. The payer of a Family plan sees how many of the 6 places are taken, shares the
 * invite link and can take an adult off the plan; someone on another person's plan sees whose it is
 * and can leave. Someone who opened an invite link while already learning can join from here.
 */
export function FamilyCard() {
  const kid = useIsKid();
  const family = useAccount((s) => s.family);
  const pays = useAccount((s) => paysForFamily(s.subscriptions));
  const signedIn = useAccount((s) => Boolean(s.session));
  const pending = useFamilyCode();

  // The payer's family (and its invite code) is made the first time it is asked for.
  useEffect(() => {
    if (pays && family?.role !== 'owner') refreshFamily();
  }, [pays, family?.role]);

  if (!ACCOUNTS || kid || !signedIn) return null;
  if (family?.role === 'owner' && family.active) return <OwnerCard />;
  if (family?.role === 'member' && family.active) return <MemberCard />;
  if (pending && !pays) return <InvitedCard code={pending} />;
  return null;
}

function Head({ title }: { title: string }) {
  return (
    <View style={styles.head}>
      <View style={styles.icon}>
        <Ionicons name="home" size={20} color={C.onNeon} />
      </View>
      <Txt variant="h3" style={{ flex: 1 }}>
        {title}
      </Txt>
    </View>
  );
}

function OwnerCard() {
  const { t, lang } = useT();
  const family = useAccount((s) => s.family)!;
  const [msg, setMsg] = useState<{ key: Key; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const code = family.code ?? '';

  const share = async () => {
    setMsg(null);
    const url = familyLink(code, lang);
    const text = t('family.shareText');
    if (Platform.OS !== 'web') {
      await Share.share({ message: `${text} ${url}`, url }).catch(() => undefined);
      return;
    }
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      await nav.share({ title: 'Yiga Oluganda', text, url }).catch(() => undefined);
      return;
    }
    try {
      await nav.clipboard.writeText(url);
      setMsg({ key: 'family.copied', ok: true });
    } catch {
      setMsg({ key: 'auth.errGeneric', ok: false });
    }
  };

  const remove = async (userId: string) => {
    setBusy(userId);
    setMsg(null);
    const r = await removeFamilyMember(userId);
    setBusy(null);
    if (!r.ok) setMsg({ key: r.error, ok: false });
  };

  return (
    <Card style={styles.card} testID="family-plan-card">
      <Head title={t('family.title')} />
      <Txt variant="strong" testID="family-places">
        {t('family.places', { used: family.used ?? 1, seats: family.seats ?? 6 })}
      </Txt>
      <Txt variant="body" style={{ color: C.ink2 }}>
        {t('family.inviteBody')}
      </Txt>
      <Txt variant="small" testID="family-code" selectable>
        {t('family.codeLine', { code })}
      </Txt>
      <Button testID="family-share" label={t('family.share')} onPress={share} disabled={!code} />
      {(family.members ?? []).length > 0 && (
        <View style={{ gap: S.xs }}>
          <Txt variant="label">{t('family.members')}</Txt>
          {(family.members ?? []).map((m) => (
            <View key={m.user_id} style={styles.member}>
              <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {m.name || '—'}
              </Txt>
              <Pressable
                testID={`family-remove-${m.name}`}
                accessibilityRole="button"
                accessibilityLabel={t('family.removeA11y', { name: m.name || '—' })}
                onPress={() => remove(m.user_id)}
                disabled={busy !== null}
                hitSlop={8}
                style={styles.remove}
              >
                <Txt variant="small" style={{ color: C.tomato }}>
                  {t('family.remove')}
                </Txt>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <FormMessage text={msg ? t(msg.key) : null} tone={msg?.ok ? 'ok' : 'error'} />
    </Card>
  );
}

function MemberCard() {
  const { t } = useT();
  const family = useAccount((s) => s.family)!;
  const ownSub = useAccount((s) => hasAccess(s.subscriptions));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  return (
    <Card style={styles.card} testID="family-member-card">
      <Head title={t('family.memberTitle')} />
      <Txt variant="body">{t('family.memberBody', { name: family.owner_name || '—' })}</Txt>
      {ownSub && <Txt variant="small">{t('family.ownSub')}</Txt>}
      <Button kind="ghost" small testID="family-leave" label={t('family.leave')} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => !busy && setOpen(false)} testID="family-leave-sheet">
        <Txt variant="h2">{t('family.leave')}</Txt>
        <Txt variant="body">{t('family.leaveBody')}</Txt>
        <FormMessage text={error ? t(error) : null} />
        <Button
          testID="family-leave-confirm"
          kind="danger"
          loading={busy}
          label={t('family.leaveConfirm')}
          onPress={async () => {
            setBusy(true);
            setError(null);
            const r = await leaveFamily();
            setBusy(false);
            if (r.ok) setOpen(false);
            else setError(r.error);
          }}
        />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => setOpen(false)} disabled={busy} />
      </Sheet>
    </Card>
  );
}

/** Opened an invite link while already learning (a class, or a plan of their own). */
function InvitedCard({ code }: { code: string }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  return (
    <Card style={styles.card} testID="family-invited-card">
      <Head title={t('family.memberTitle')} />
      <Txt variant="body">{t('family.invited', { code })}</Txt>
      <FormMessage text={error ? t(error) : null} />
      <Button
        testID="family-invited-join"
        label={t('family.join')}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          const r = await joinFamily(code);
          setBusy(false);
          if (r.ok) forgetFamilyCode();
          else setError(r.error);
        }}
      />
      <Button kind="ghost" small label={t('common.cancel')} onPress={forgetFamilyCode} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm, borderColor: C.neon },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center' },
  member: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 40, borderTopWidth: 1, borderTopColor: C.line },
  remove: { paddingHorizontal: S.sm, paddingVertical: 6, borderRadius: R.sm },
});
