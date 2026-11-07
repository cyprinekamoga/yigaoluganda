import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { UNIT_1 } from '@/content';
import { useT } from '@/i18n';
import { adviceFor } from '@/logic/advice';
import { dayKey } from '@/logic/dates';
import { activeToday, regenHearts, visibleStreak } from '@/logic/progress';
import { dueIds } from '@/logic/srs';
import { isComplete, lessonsDone, tileStatus } from '@/logic/unlock';
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
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const now = useNow();
  const name = profile?.name ?? '';

  const unit = UNIT_1;
  const view = { done, opened, lastChapterId };
  const statuses = unit.chapters.map((c) => tileStatus(unit, c, view));
  const today = dayKey();
  const completedCount = unit.chapters.filter((c) => isComplete(c, done)).length;

  const advice = useMemo(
    () =>
      adviceFor({
        hearts: regenHearts(stats, now).hearts,
        streak: visibleStreak(stats, today),
        activeToday: activeToday(stats, today),
        lessonsDone: Object.keys(done).length,
        activeChapter: unit.chapters.find((_, i) => statuses[i] === 'active'),
        unlockedChapter: unit.chapters.find((_, i) => statuses[i] === 'unlocked'),
        dueCount: dueIds(srs, today, 50).length,
        allDone: completedCount === unit.chapters.length,
      }),
    [stats, now, today, done, srs, statuses, completedCount, unit.chapters],
  );
  const adviceText = t(`advice.${advice.key}`, {
    n: advice.count ?? 0,
    title: advice.chapter ? tr(advice.chapter.title) : '',
  });

  const col = Math.min(width, MAX_W) - S.lg * 2;
  const tileW = (col - S.md) / 2;

  const openTile = (id: string, i: number) => {
    const ch = unit.chapters[i];
    if (statuses[i] === 'locked') {
      setLockedMsg(ch.checkpoint ? t('chapter.lockedCheckpoint') : t('chapter.lockedBody'));
      return;
    }
    openChapter(id);
    router.push(`/chapter/${id}`);
  };

  return (
    <LargeTitleScreen testID="screen-home" title={t('tabs.home')} trailing={<StatsBar />} compactAlign="leading">

      <Card style={styles.hello}>
        <Ngaali mood="idle" size={78} />
        <View style={styles.helloText}>
          <Txt variant="h2" testID="home-greeting">
            {t('home.greeting', { name })}
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

      <View style={styles.unitHead}>
        <Txt variant="label">{t('home.unit', { n: unit.n })}</Txt>
        <Txt variant="h2" accessibilityRole="header">
          {tr(unit.title)}
        </Txt>
        <View style={styles.unitBar} accessibilityLabel={`${completedCount} / ${unit.chapters.length}`}>
          <View style={[styles.unitFill, { width: `${(completedCount / unit.chapters.length) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.grid}>
        {unit.chapters.map((c, i) => (
          <ChapterTile key={c.id} chapter={c} status={statuses[i]} done={lessonsDone(c, done)} width={tileW} onPress={() => openTile(c.id, i)} />
        ))}
      </View>

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
  unitHead: { gap: 2, marginTop: S.sm },
  unitBar: { height: 8, borderRadius: R.pill, backgroundColor: C.paperDeep, overflow: 'hidden', marginTop: S.sm },
  unitFill: { height: 8, borderRadius: R.pill, backgroundColor: C.tomato },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  soon: { backgroundColor: C.paperDeep, borderStyle: 'dashed', gap: S.xs },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
