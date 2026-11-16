import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { useT, type Key } from '../i18n';
import { useIsKid } from '../learners/store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { C, F, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { getInviteCode } from './actions';
import { FormMessage } from './AuthShell';
import { ACCOUNTS, SITE_URL } from './config';
import { selectAccess, useAccount } from './store';
import { supabase } from './supabase';
import { useInvite } from './invite';

/** The link a friend opens: the landing page, which carries the code on to sign-up. */
export const inviteLink = (code: string, lang: 'en' | 'sv') => `${SITE_URL}${lang === 'sv' ? '/sv/' : '/'}?ref=${encodeURIComponent(code)}`;

/** On the Me tab, for paying learners: give a friend a free month, get a free month. */
export function InviteCard() {
  const { t, lang } = useT();
  const kid = useIsKid();
  const access = useAccount(selectAccess);
  const uid = useAccount((s) => s.session?.user.id ?? null);
  const [code, setCode] = useState<string | null>(null);
  const [counts, setCounts] = useState({ joined: 0, earned: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ key: Key; ok: boolean } | null>(null);
  const show = ACCOUNTS && access && !kid && Boolean(uid);

  useEffect(() => {
    if (!show || !supabase || !uid) return;
    let live = true;
    supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => live && data?.code && setCode(data.code as string));
    supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', uid)
      .then(({ data }) => {
        if (!live || !data) return;
        setCounts({ joined: data.length, earned: data.filter((r) => r.status !== 'joined').length });
      });
    return () => {
      live = false;
    };
  }, [show, uid]);

  if (!show) return null;

  const getCode = async () => {
    setBusy(true);
    setMsg(null);
    const r = await getInviteCode();
    setBusy(false);
    if ('error' in r) return setMsg({ key: r.error, ok: false });
    setCode(r.code);
  };

  const share = async () => {
    if (!code) return;
    setMsg(null);
    const url = inviteLink(code, lang);
    const text = t('invite.shareText');
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
      setMsg({ key: 'invite.copied', ok: true });
    } catch {
      setMsg({ key: 'auth.errGeneric', ok: false });
    }
  };

  return (
    <Card style={styles.card} testID="invite-card">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="gift" size={20} color={C.onNeon} />
        </View>
        <Txt variant="h3" style={{ flex: 1 }}>
          {t('invite.title')}
        </Txt>
      </View>
      <Txt variant="body" style={{ color: C.ink2 }}>
        {t('invite.body')}
      </Txt>
      {code ? (
        <>
          <View style={styles.codeBox}>
            <Txt style={styles.code} testID="invite-code" selectable>
              {code}
            </Txt>
          </View>
          <Button testID="invite-share" label={t('invite.share')} onPress={share} />
        </>
      ) : (
        <Button testID="invite-get" kind="secondary" label={t('invite.get')} loading={busy} onPress={getCode} />
      )}
      <FormMessage text={msg ? t(msg.key) : null} tone={msg?.ok ? 'ok' : 'error'} />
      {counts.joined > 0 && (
        <Txt variant="small" testID="invite-counts">
          {t('invite.counts', { joined: counts.joined, earned: counts.earned })}
        </Txt>
      )}
    </Card>
  );
}

/** On sign-up and the plan: "invited by a friend: your first month is free". */
export function InviteBanner() {
  const { t } = useT();
  const code = useInvite();
  if (!ACCOUNTS || !code) return null;
  return (
    <View style={styles.banner} testID="invite-banner">
      <Ionicons name="gift" size={20} color={C.onNeon} />
      <Txt variant="strong" style={{ flex: 1, color: C.onNeon }}>
        {t('invite.banner', { code })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm, borderColor: C.neon },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center' },
  codeBox: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: S.sm, borderRadius: R.md, borderWidth: 1, borderStyle: 'dashed', borderColor: C.neon },
  code: { ...F.semi, fontSize: 22, letterSpacing: 2, color: C.neon },
  banner: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.neon, borderRadius: R.md, padding: S.md },
});
