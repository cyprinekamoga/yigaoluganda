import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { FormMessage } from '@/account/AuthShell';
import { saveCertificatePdf } from '@/account/certificatePdf';
import { issueCertificate } from '@/account/certificates';
import { ACCOUNTS, SITE_URL } from '@/account/config';
import { UNITS, type Unit } from '@/content';
import { useT, type Key } from '@/i18n';
import { certificateHtml, partFinished, partPhrasesLearned, verifyUrl, type CertificateText } from '@/logic/certificate';
import { isComplete } from '@/logic/unlock';
import { useApp, type IssuedCert } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Beads } from '@/ui/Beads';
import { Button } from '@/ui/Button';
import { Ngaali } from '@/ui/Ngaali';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/**
 * The certificate for finishing a part of the course. The learner puts their name on it, the
 * account's server issues it with a code, and it can be saved as a PDF, printed or shared as a
 * link to the check page on yigaoluganda.com.
 */
export default function CertificateScreen() {
  const { part } = useLocalSearchParams<{ part: string }>();
  // Wait for the address to be read before deciding the part doesn't exist.
  if (!part) return null;
  const unit = UNITS.find((u) => String(u.n) === part);
  if (!unit) return <Redirect href="/" />;
  return <CertificateFor unit={unit} />;
}

function CertificateFor({ unit }: { unit: Unit }) {
  const { t, tr, lang } = useT();
  const router = useRouter();
  const done = useApp((s) => s.done);
  const srs = useApp((s) => s.srs);
  const profileName = useApp((s) => s.profile?.name ?? '');
  const cert: IssuedCert | undefined = useApp((s) => s.certs?.[String(unit.n)]);
  const saveCert = useApp((s) => s.saveCert);
  const [name, setName] = useState(cert?.name ?? profileName);
  const [editing, setEditing] = useState(!cert);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [note, setNote] = useState<Key | null>(null);
  // Before it is issued, the certificate shows today's date.
  const [today] = useState(() => Date.now());

  const finished = partFinished(unit, done);
  if (!finished) {
    const chapters = unit.chapters.filter((c) => isComplete(c, done)).length;
    return (
      <Screen header={<BackBar title={t('cert.title')} />} testID="screen-certificate">
        <View style={styles.center}>
          <Ngaali mood="think" size={110} />
          <Txt variant="h2" style={styles.centerText}>
            {t('cert.notYetTitle')}
          </Txt>
          <Txt variant="body" style={[styles.centerText, { color: C.ink2 }]} testID="cert-not-yet">
            {t('cert.notYet', { n: unit.n })}
          </Txt>
          <Beads total={unit.chapters.length} done={chapters} size={12} color={C.neon} />
          <Txt variant="small">{t('cert.progress', { done: chapters, total: unit.chapters.length })}</Txt>
        </View>
        <Button kind="secondary" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Screen>
    );
  }

  const phrases = cert?.phrases ?? partPhrasesLearned(unit, srs);
  const shownName = (editing ? name : cert?.name ?? name).trim();
  const code = cert?.code ?? 'YO-····-····-····';
  const date = new Date(cert?.issuedAt ?? today).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const checkUrl = verifyUrl(SITE_URL, code, lang);
  const text: CertificateText = {
    lang,
    heading: t('cert.heading'),
    certifies: t('cert.certifies'),
    name: shownName,
    completed: t('cert.completed', { n: unit.n, title: tr(unit.title) }),
    detail: phrases > 0 ? t('cert.detail', { n: phrases }) : t('cert.detailPlain'),
    issued: t('cert.issued', { date }),
    codeLabel: t('cert.codeLabel'),
    code,
    checkLabel: t('cert.checkLabel'),
    checkUrl,
  };

  const issue = async () => {
    const clean = name.trim();
    if (!clean) return;
    if (!ACCOUNTS) return setError('cert.errSignedOut');
    setBusy(true);
    setError(null);
    setNote(null);
    const r = await issueCertificate({ part: unit.n, name: clean, lang, phrases });
    setBusy(false);
    if ('error' in r) return setError(r.error === 'no_access' ? 'cert.errAccess' : r.error === 'signed_out' ? 'cert.errSignedOut' : 'auth.errNetwork');
    saveCert(unit.n, { code: r.code, name: clean, issuedAt: r.issuedAt, phrases });
    setEditing(false);
  };

  const pdf = async () => {
    setNote(null);
    setError(null);
    const ok = await saveCertificatePdf(certificateHtml(text), t('cert.fileTitle', { name: shownName }));
    if (!ok) setError('cert.errPdf');
  };

  const share = async () => {
    if (!cert) return;
    setError(null);
    setNote(null);
    const message = t('cert.shareText', { n: unit.n });
    if (Platform.OS !== 'web') {
      await Share.share({ message: `${message} ${checkUrl}`, url: checkUrl }).catch(() => undefined);
      return;
    }
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      // Closing the share sheet throws; that's fine.
      await nav.share({ title: t('cert.fileTitle', { name: shownName }), text: message, url: checkUrl }).catch(() => undefined);
      return;
    }
    try {
      await nav.clipboard.writeText(checkUrl);
      setNote('cert.copied');
    } catch {
      setError('cert.errPdf');
    }
  };

  return (
    <Screen header={<BackBar title={t('cert.title')} />} testID="screen-certificate">
      <CertificateCard text={text} issued={Boolean(cert)} />

      {editing ? (
        <View style={{ gap: S.md }}>
          <TextField
            testID="cert-name"
            label={t('cert.nameLabel')}
            hint={t('cert.nameHint')}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="done"
            onSubmitEditing={issue}
          />
          <FormMessage text={error ? t(error) : null} />
          <Button testID="cert-issue" label={cert ? t('cert.saveName') : t('cert.get')} loading={busy} disabled={!name.trim()} onPress={issue} />
          {cert && <Button kind="ghost" label={t('common.cancel')} onPress={() => (setName(cert.name), setEditing(false), setError(null))} />}
        </View>
      ) : (
        <View style={{ gap: S.md }}>
          <FormMessage text={error ? t(error) : note ? t(note) : null} tone={error ? 'error' : 'ok'} />
          <Button testID="cert-pdf" label={t('cert.pdf')} onPress={pdf} />
          <Button testID="cert-share" kind="secondary" label={t('cert.share')} onPress={share} />
          <Button testID="cert-rename" kind="ghost" label={t('cert.changeName')} onPress={() => (setEditing(true), setNote(null))} />
        </View>
      )}
      <Txt variant="small" style={styles.centerText}>
        {t('cert.lead')}
      </Txt>
    </Screen>
  );
}

/** The certificate as it looks on paper: cream, with a maroon frame and a string of beads. */
function CertificateCard({ text, issued }: { text: CertificateText; issued: boolean }) {
  return (
    <View style={styles.paper} testID="cert-card" accessible accessibilityLabel={`${text.heading}. ${text.certifies} ${text.name} ${text.completed} ${text.detail} ${text.issued}. ${text.codeLabel} ${text.code}`}>
      <View style={styles.inner}>
        <Txt style={styles.brand}>YIGA OLUGANDA</Txt>
        <Txt style={styles.heading}>{text.heading}</Txt>
        <View style={styles.beads}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[styles.bead, { backgroundColor: i % 2 ? C.paper : C.tomato }]} />
          ))}
        </View>
        <Txt style={styles.certifies}>{text.certifies}</Txt>
        <Txt style={styles.name} numberOfLines={2} testID="cert-card-name">
          {text.name || ' '}
        </Txt>
        <Txt style={styles.completed}>{text.completed}</Txt>
        <Txt style={styles.detail}>{text.detail}</Txt>
        <View style={styles.foot}>
          <Txt style={styles.footText}>{text.issued}</Txt>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt style={styles.footText}>{text.codeLabel}</Txt>
            <Txt style={[styles.code, !issued && { color: '#A8807A' }]} testID="cert-code">
              {text.code}
            </Txt>
          </View>
        </View>
      </View>
    </View>
  );
}

const INK = '#250104';
const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: S.md, paddingVertical: S.lg },
  centerText: { textAlign: 'center' },
  paper: { backgroundColor: '#FFFAF0', borderRadius: R.md, padding: 6, borderWidth: 5, borderColor: INK },
  inner: { borderWidth: 1.5, borderColor: C.tomato, borderRadius: R.sm, paddingVertical: S.lg, paddingHorizontal: S.md, alignItems: 'center', gap: 6 },
  brand: { ...F.semi, fontSize: 11, letterSpacing: 3, color: C.tomato },
  heading: { ...F.heading, fontSize: 30, lineHeight: 36, color: INK },
  beads: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  bead: { width: 8, height: 8, borderRadius: 4 },
  certifies: { fontSize: 14, fontStyle: 'italic', color: INK, marginTop: S.sm },
  name: { ...F.heading, fontSize: 26, lineHeight: 32, color: INK, textAlign: 'center', borderBottomWidth: 1.5, borderBottomColor: INK, paddingHorizontal: S.md, paddingBottom: 4, minWidth: '70%' },
  completed: { ...F.semi, fontSize: 16, color: INK, textAlign: 'center', marginTop: S.sm },
  detail: { fontSize: 14, lineHeight: 20, color: INK, textAlign: 'center' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', alignSelf: 'stretch', marginTop: S.md, gap: S.sm },
  footText: { fontSize: 11, color: INK },
  code: { ...F.semi, fontSize: 13, letterSpacing: 1, color: INK },
});
