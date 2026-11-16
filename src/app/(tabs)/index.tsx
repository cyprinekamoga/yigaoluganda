import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ALL_CHAPTERS, UNITS, type Chapter } from '@/content';
import { useT } from '@/i18n';
import { adviceFor } from '@/logic/advice';
import { dayKey } from '@/logic/dates';
import { activeToday, regenHearts, visibleStreak } from '@/logic/progress';
import { dueIds } from '@/logic/srs';
import { chapterStatus, lockedReason, unitOpen } from '@/logic/course';
import { isComplete, lessonsDone } from '@/logic/unlock';
import { LearnerChip } from '@/learners/LearnerChip';
import { KIDS_MODE, useIsKid } from '@/learners/store';
import { ReminderOffer } from '@/reminders/ReminderSettings';
import { useApp } from '@/state/store';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChapterTile } from '@/ui/ChapterTile';
import { Ngaali } from '@/ui/Ngaali';
import { LargeTitleScreen } from '@/ui/LargeTitleScreen';
import { Sheet } from '@/ui/Sheet';
import { StatsBar, useNow } from '@/ui/StatsBar';
import { C, MAX_W, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function Home() {
  const { t, tr } = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profile = useApp((s) => s.profile);
  const done = useApp((s) => s.done);
  const opened = useApp((s) => s.opened);
  const lastChapterId = useApp((s) => s.lastChapterId);
  const stats = useApp((s) => s.stats);
  const srs = useApp((s) => s.srs);
  const openChapter = useApp((s) => s.openChapter);
  const placementSeen = useApp((s) => s.placementSeen);
  const setPlacementSeen = useApp((s) => s.setPlacementSeen);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const kid = useIsKid();
  const now = useNow();
  const name = profile?.name ?? '';

  const view = { done, opened, lastChapterId };
  const statusOf = new Map(ALL_CHAPTERS.map((c) => [c.id, chapterStatus(c, view)]));
  const statuses = ALL_CHAPTERS.map((c) => statusOf.get(c.id)!);
  const today = dayKey();
  const completedCount = ALL_CHAPTERS.filter((c) => isComplete(c, done)).length;

  const advice = useMemo(
    () =>
      adviceFor({
        hearts: regenHearts(stats, now).hearts,
        streak: visibleStreak(stats, today),
        activeToday: activeToday(stats, today),
        lessonsDone: Object.keys(done).length,
        activeChapter: ALL_CHAPTERS.find((_, i) => statuses[i] === 'active'),
        unlockedChapter: ALL_CHAPTERS.find((_, i) => statuses[i] === 'unlocked'),
        dueCount: dueIds(srs, today, 50).length,
        allDone: completedCount === ALL_CHAPTERS.length,
      }),
    [stats, now, today, done, srs, statuses, completedCount],
  );
  const adviceText = t(`advice.${advice.key}`, {
    n: advice.count ?? 0,
    title: advice.chapter ? tr(advice.chapter.title) : '',
  });

  const col = Math.min(width, MAX_W) - S.lg * 2;
  const tileW = (col - S.md) / 2;

  const openTile = (ch: Chapter) => {
    if (statusOf.get(ch.id) === 'locked') {
      setLockedMsg(t(lockedReason(ch, done)));
      return;
    }
    openChapter(ch.id);
    router.push(`/chapter/${ch.id}`);
  };

  return (
    <LargeTitleScreen testID="screen-home" title={t('tabs.home')} trailing={<StatsBar />} compactAlign="leading">
      {KIDS_MODE && <LearnerChip />}

      <Card style={styles.hello}>
        <Ngaali mood={kid ? 'wave' : 'idle'} size={78} />
        <View style={styles.helloText}>
          <Txt variant="h2" testID="home-greeting">
            {kid ? t('kid.greeting', { name }) : t('home.greeting', { name })}
          </Txt>
          <Txt variant="body" style={{ color: C.ink2 }}>
            {adviceText}
          </Txt>
          {advice.key === 'noHearts' && (
            <Button small kind="neon" label={t('hearts.review')} onPress={() => router.push('/practice/review')} style={styles.adviceBtn} />
          )}
          {advice.key === 'review' && (
            <Button small kind="neon" label={t('practice.review')} onPress={() => router.push('/practice/review')} style={styles.adviceBtn} />
          )}
        </View>
      </Card>

      {!kid && <ReminderOffer />}

      {/* New learners can test out of what they already know. */}
      {!placementSeen && Object.keys(done).length === 0 && (
        <Card style={styles.place} testID="placement-offer">
          <View style={styles.placeRow}>
            <Ngaali mood="think" size={58} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3">{t('place.title')}</Txt>
              <Txt variant="small">{t('place.homeBody')}</Txt>
            </View>
          </View>
          <View style={styles.placeButtons}>
            <Button small kind="neon" testID="placement-open" label={t('place.homeCta')} onPress={() => router.push('/placement')} style={{ flex: 1 }} />
            <Button small kind="ghost" label={t('place.notNow')} onPress={setPlacementSeen} />
          </View>
        </Card>
      )}

      {UNITS.map((unit) => {
        const finished = unit.chapters.filter((c) => isComplete(c, done)).length;
        const open = unitOpen(unit, done);
        return (
          <View key={unit.id} style={styles.unit} testID={`unit-${unit.n}`}>
            <View style={styles.unitHead}>
              <Txt variant="label">{t('home.unit', { n: unit.n })}</Txt>
              <Txt variant="h2" accessibilityRole="header">
                {tr(unit.title)}
              </Txt>
              <View style={styles.unitBar} accessibilityLabel={`${finished} / ${unit.chapters.length}`}>
                <View style={[styles.unitFill, { width: `${(finished / unit.chapters.length) * 100}%` }]} />
              </View>
              {!open && (
                <View style={styles.partLocked}>
                  <Txt variant="small" style={{ color: C.ink2 }}>
                    {t('chapter.lockedPart')}
                  </Txt>
                  <Button small kind="secondary" label={t('practice.placement')} onPress={() => router.push('/placement')} style={{ alignSelf: 'flex-start' }} />
                </View>
              )}
            </View>
            <View style={styles.grid}>
              {unit.chapters.map((c) => (
                <ChapterTile key={c.id} chapter={c} status={statusOf.get(c.id)!} done={lessonsDone(c, done)} width={tileW} onPress={() => openTile(c)} />
              ))}
            </View>
          </View>
        );
      })}

      <Card style={styles.soon}>
        <Txt variant="h3">{t('home.moreSoon')}</Txt>
        <Txt variant="small">{t('home.moreSoonBody')}</Txt>
      </Card>

      <Sheet visible={lockedMsg !== null} onClose={() => setLockedMsg(null)}>
        <View style={styles.lockedRow}>
          <Ngaali mood="think" size={64} />
          <View style={{ flex: 1, gap: S.xs }}>
            <Txt variant="h3">{t('chapter.lockedTitle')}</Txt>
            <Txt variant="body">{lockedMsg}</Txt>
          </View>
        </View>
        <Button label={t('common.close')} onPress={() => setLockedMsg(null)} />
      </Sheet>
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  hello: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  helloText: { flex: 1, gap: S.xs },
  adviceBtn: { alignSelf: 'flex-start', marginTop: S.xs },
  unit: { gap: S.md },
  place: { gap: S.md, borderColor: C.neon },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  placeButtons: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  partLocked: { gap: S.sm, marginTop: S.xs },
  unitHead: { gap: 2, marginTop: S.sm },
  unitBar: { height: 8, borderRadius: R.pill, backgroundColor: C.paperDeep, overflow: 'hidden', marginTop: S.sm },
  unitFill: { height: 8, borderRadius: R.pill, backgroundColor: C.tomato },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  soon: { backgroundColor: C.paperDeep, borderStyle: 'dashed', gap: S.xs },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
