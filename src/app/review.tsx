import Ionicons from '@expo/vector-icons/Ionicons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FormMessage } from '@/account/AuthShell';
import {
  answerFeedback,
  listReviewers,
  openReports,
  openRequests,
  RATINGS,
  recordingUrl,
  resolveReport,
  setReviewer,
  type OpenRequest,
  type Rating,
  type ReportRow,
  type ReviewerRow,
} from '@/account/feedback';
import { useAccount } from '@/account/store';
import { PHRASES } from '@/content';
import { RATING_ICON, RATING_KEY } from '@/feedback/Inbox';
import { reportKindKey, useItemLabel } from '@/feedback/Report';
import { useT, type Key } from '@/i18n';
import { SpeakerButtons } from '@/lesson/SpeakerButtons';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

type Tab = 'recordings' | 'reports' | 'reviewers';

/**
 * For the people who review: learners' recordings to rate, "Report a mistake" reports to close,
 * and (for the owner) who may review. The daily e-mail and each new report link here.
 */
export default function Review() {
  const { t } = useT();
  const role = useAccount((s) => s.role);
  const [tab, setTab] = useState<Tab>('recordings');
  const [requests, setRequests] = useState<OpenRequest[] | null | 'error'>(null);
  const [reports, setReports] = useState<ReportRow[] | null | 'error'>(null);

  const load = useCallback(() => {
    openRequests().then((r) => setRequests(r ?? 'error'));
    openReports().then((r) => setReports(r ?? 'error'));
  }, []);
  useEffect(() => {
    if (role) load();
  }, [role, load]);

  if (!role) {
    return (
      <Screen header={<BackBar title={t('review.title')} />} testID="screen-review">
        <Txt variant="body">{t('review.noRole')}</Txt>
      </Screen>
    );
  }

  const count = (x: unknown[] | null | 'error') => (Array.isArray(x) ? x.length : 0);
  const tabs: [Tab, string][] = [
    ['recordings', t('review.recordings', { n: count(requests) })],
    ['reports', t('review.reports', { n: count(reports) })],
    ...(role === 'owner' ? ([['reviewers', t('review.reviewers')]] as [Tab, string][]) : []),
  ];

  return (
    <Screen header={<BackBar title={t('review.title')} />} testID="screen-review">
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map(([id, label]) => (
          <Pressable key={id} testID={`review-tab-${id}`} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} style={[styles.tab, tab === id && styles.tabOn]}>
            <Txt variant="small" style={[styles.tabText, tab === id && { color: C.onNeon }]} numberOfLines={1}>
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {tab === 'recordings' &&
        (requests === 'error' ? (
          <FormMessage text={t('auth.errNetwork')} />
        ) : requests && requests.length === 0 ? (
          <Txt variant="body">{t('review.empty')}</Txt>
        ) : (
          requests?.map((r) => <RecordingItem key={r.id} r={r} onDone={() => setRequests((x) => (Array.isArray(x) ? x.filter((y) => y.id !== r.id) : x))} />)
        ))}

      {tab === 'reports' &&
        (reports === 'error' ? (
          <FormMessage text={t('auth.errNetwork')} />
        ) : reports && reports.length === 0 ? (
          <Txt variant="body">{t('review.empty')}</Txt>
        ) : (
          reports?.map((r) => <ReportItem key={r.id} r={r} onDone={() => setReports((x) => (Array.isArray(x) ? x.filter((y) => y.id !== r.id) : x))} />)
        ))}

      {tab === 'reviewers' && role === 'owner' && <Reviewers />}
    </Screen>
  );
}

const when = (iso: string, lang: 'en' | 'sv') => new Date(iso).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function RecordingItem({ r, onDone }: { r: OpenRequest; onDone: () => void }) {
  const { t, tr, lang } = useT();
  const p = PHRASES[r.phrase_id];
  const player = useRef<AudioPlayer | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [tip, setTip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);

  useEffect(() => () => player.current?.remove(), []);

  const play = async () => {
    setError(null);
    if (!player.current) {
      const url = r.audio_path ? await recordingUrl(r.audio_path) : null;
      if (!url) return setError('review.noAudio');
      player.current = createAudioPlayer({ uri: url });
    }
    await player.current.seekTo(0).catch(() => undefined);
    player.current.play();
  };

  const send = async () => {
    if (!rating) return;
    setBusy(true);
    setError(null);
    const ok = await answerFeedback(r.id, rating, tip);
    setBusy(false);
    if (ok) onDone();
    else setError('auth.errNetwork');
  };

  return (
    <Card style={styles.item} testID="review-recording">
      <View>
        <Txt variant="lgBig" style={{ fontSize: 24, lineHeight: 30 }}>
          {p?.lg ?? r.phrase_id}
        </Txt>
        {p && <Txt variant="small">{tr(p.tr)}</Txt>}
        <Txt variant="caption" style={{ color: C.ink3 }}>
          {when(r.created_at, lang)} · {t(r.lang === 'sv' ? 'review.tipInSv' : 'review.tipInEn')}
        </Txt>
      </View>
      <View style={styles.row}>
        <Pressable testID="review-play" onPress={play} accessibilityRole="button" style={styles.play}>
          <Ionicons name="play" size={18} color={C.onNeon} />
          <Txt variant="strong" style={{ color: C.onNeon }}>
            {t('review.play')}
          </Txt>
        </Pressable>
        {p && <SpeakerButtons id={p.id} />}
      </View>
      <View style={styles.ratings} accessibilityRole="radiogroup">
        {RATINGS.map((k) => (
          <Pressable key={k} testID={`review-rate-${k}`} onPress={() => setRating(k)} accessibilityRole="radio" accessibilityState={{ checked: rating === k }} style={[styles.rate, rating === k && styles.rateOn]}>
            <Ionicons name={RATING_ICON[k]} size={18} color={rating === k ? C.onNeon : C.ink2} />
            <Txt variant="strong" style={rating === k ? { color: C.onNeon } : undefined}>
              {t(RATING_KEY[k])}
            </Txt>
          </Pressable>
        ))}
      </View>
      <TextInput
        testID="review-tip"
        value={tip}
        onChangeText={setTip}
        multiline
        maxLength={500}
        placeholder={t('review.tip')}
        placeholderTextColor={C.ink3}
        accessibilityLabel={t('review.tip')}
        style={styles.input}
      />
      <FormMessage text={error ? t(error) : null} />
      <Button testID="review-send" label={t('review.send')} disabled={!rating} loading={busy} onPress={send} />
    </Card>
  );
}

function ReportItem({ r, onDone }: { r: ReportRow; onDone: () => void }) {
  const { t, lang } = useT();
  const label = useItemLabel({ type: r.item_type, id: r.item_id ?? undefined });
  const [busy, setBusy] = useState<'fixed' | 'not_a_mistake' | null>(null);
  const [error, setError] = useState(false);

  const close = async (status: 'fixed' | 'not_a_mistake') => {
    setBusy(status);
    setError(false);
    const ok = await resolveReport(r.id, status);
    setBusy(null);
    if (ok) onDone();
    else setError(true);
  };

  return (
    <Card style={styles.item} testID="review-report">
      <Txt variant="label" style={{ color: C.tomatoDeep }}>
        {t(reportKindKey(r.kind))}
      </Txt>
      <Txt variant="strong">{label || `${r.item_type} ${r.item_id ?? ''}`}</Txt>
      <Txt variant="caption" style={{ color: C.ink3 }}>
        {[r.item_type, r.item_id, r.lesson_id && t('review.lesson', { id: r.lesson_id }), r.lang.toUpperCase(), r.platform, r.app_version, when(r.created_at, lang)].filter(Boolean).join(' · ')}
      </Txt>
      {r.note ? <Txt variant="body">“{r.note}”</Txt> : null}
      <FormMessage text={error ? t('auth.errNetwork') : null} />
      <View style={styles.row}>
        <Button style={{ flex: 1 }} small testID="review-fixed" label={t('review.fixed')} loading={busy === 'fixed'} onPress={() => close('fixed')} />
        <Button style={{ flex: 1 }} small kind="secondary" testID="review-not-mistake" label={t('review.notMistake')} loading={busy === 'not_a_mistake'} onPress={() => close('not_a_mistake')} />
      </View>
    </Card>
  );
}

function Reviewers() {
  const { t } = useT();
  const [rows, setRows] = useState<ReviewerRow[] | null | 'error'>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ key: Key; ok: boolean } | null>(null);

  const load = useCallback(() => {
    listReviewers().then((r) => setRows(r ?? 'error'));
  }, []);
  useEffect(load, [load]);

  const change = async (address: string, on: boolean) => {
    setBusy(true);
    setMsg(null);
    const r = await setReviewer(address, on);
    setBusy(false);
    if (r === null) return setMsg({ key: 'auth.errNetwork', ok: false });
    if (r === 'no_account') return setMsg({ key: 'review.noAccount', ok: false });
    setMsg({ key: r === 'added' ? 'review.added' : 'review.removed', ok: true });
    if (on) setEmail('');
    load();
  };

  return (
    <View style={{ gap: S.md }}>
      <Card style={styles.item}>
        <TextField
          testID="reviewer-email"
          label={t('review.addLabel')}
          hint={t('review.addHint')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />
        <FormMessage text={msg ? t(msg.key) : null} tone={msg?.ok ? 'ok' : 'error'} />
        <Button testID="reviewer-add" label={t('review.add')} disabled={!email.includes('@')} loading={busy} onPress={() => change(email, true)} />
      </Card>
      {rows === 'error' && <FormMessage text={t('auth.errNetwork')} />}
      {Array.isArray(rows) &&
        rows.map((r) => (
          <Card key={r.email} style={[styles.item, styles.rowBetween]}>
            <View style={{ flex: 1 }}>
              <Txt variant="strong" numberOfLines={1}>
                {r.email}
              </Txt>
              <Txt variant="caption" style={{ color: C.ink3 }}>
                {r.role === 'owner' ? t('review.owner') : t('review.reviewer')}
              </Txt>
            </View>
            {r.role !== 'owner' && <Button small kind="ghost" label={t('review.remove')} onPress={() => change(r.email, false)} />}
          </Card>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: S.xs, backgroundColor: C.card, borderRadius: R.pill, padding: 4 },
  tab: { flexGrow: 1, minHeight: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.md },
  tabText: { ...F.semi, color: C.ink },
  tabOn: { backgroundColor: C.neon },
  item: { gap: S.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  play: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 44, borderRadius: R.pill, backgroundColor: C.neon },
  ratings: { gap: S.xs },
  rate: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 44, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: S.md },
  rateOn: { backgroundColor: C.neon, borderColor: C.neon },
  input: { ...F.body, minHeight: 70, color: C.ink, fontSize: 16, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.paperDeep, textAlignVertical: 'top' },
});
