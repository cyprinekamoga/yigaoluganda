import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CHAPTERS, PHRASES, TIPS, UNIT_1, type Tip } from '@/content';
import { useT } from '@/i18n';
import { isAvailable, isLessonOpen, lessonsDone, nextLessonIndex } from '@/logic/unlock';
import { useApp } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { TipIconBadge } from '@/ui/TipIcon';
import { Ngaali } from '@/ui/Ngaali';
import { ProgressRing } from '@/ui/ProgressRing';
import { Scene } from '@/ui/Scene';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { C, F, HUES, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, tr } = useT();
  const done = useApp((s) => s.done);
  const [tip, setTip] = useState<Tip | null>(null);
  const chapter = CHAPTERS[id ?? ''];

  if (!chapter) {
    return (
      <Screen>
        <BackBar />
        <Txt variant="h2">404</Txt>
      </Screen>
    );
  }

  const h = HUES[chapter.hue];
  const available = isAvailable(UNIT_1, chapter, done);
  const n = lessonsDone(chapter, done);
  const next = nextLessonIndex(chapter, done);
  const phraseIds = chapter.lessons.flatMap((l) => l.phrases);
  const tipIds = chapter.lessons.map((l) => l.tip).filter((x): x is string => Boolean(x && TIPS[x]));

  const play = (index: number) => router.push(`/lesson/${chapter.lessons[index].id}`);

  return (
    <Screen testID="screen-chapter" header={<BackBar />}>
      <View style={styles.hero}>
        <ProgressRing size={200} stroke={10} segments={chapter.lessons.length} done={n} color={h.base} track={h.track}>
          <Scene scene={chapter.scene} hue={chapter.hue} size={170} muted={!available} />
        </ProgressRing>
        <Txt variant="label" style={{ color: h.deep }}>
          {chapter.checkpoint ? `${t('chapter.checkpoint')} · ` : ''}
          {t('home.chapter', { n: chapter.n })} · {chapter.lgTitle}
        </Txt>
        <Txt variant="title" style={styles.center} accessibilityRole="header">
          {tr(chapter.title)}
        </Txt>
        <Txt variant="body" style={[styles.center, { color: C.ink2 }]}>
          {tr(chapter.scenario)} · {t('home.lessons', { done: n, total: chapter.lessons.length })}
        </Txt>
      </View>

      {!available ? (
        <Card style={styles.lockedCard}>
          <Ngaali mood="think" size={60} />
          <View style={{ flex: 1, gap: S.xs }}>
            <Txt variant="h3">{t('chapter.lockedTitle')}</Txt>
            <Txt variant="body">{chapter.checkpoint ? t('chapter.lockedCheckpoint') : t('chapter.lockedBody')}</Txt>
          </View>
        </Card>
      ) : next !== null ? (
        <Button testID="chapter-start" label={t('chapter.start', { n: next + 1 })} onPress={() => play(next)} />
      ) : (
        <Card style={[styles.lockedCard, { backgroundColor: C.leafSoft, borderColor: C.leafSoft }]}>
          <Ngaali mood="badge" size={60} />
          <Txt variant="h3" style={{ color: C.leafDeep, flex: 1 }}>
            {t('chapter.complete')}
          </Txt>
        </Card>
      )}

      <View style={styles.section}>
        <Txt variant="label">{t('chapter.lessons')}</Txt>
        {chapter.lessons.map((lesson, i) => {
          const isDone = Boolean(done[lesson.id]);
          const open = available && isLessonOpen(chapter, i, done);
          const isNext = open && !isDone && i === next;
          return (
            <Pressable
              key={lesson.id}
              testID={`lesson-row-${lesson.id}`}
              disabled={!open}
              onPress={() => play(i)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !open }}
              accessibilityLabel={`${t('chapter.lessonN', { n: i + 1 })}: ${tr(lesson.title)}. ${isDone ? t('status.completed') : open ? '' : t('common.locked')}`}
              style={({ pressed }) => [styles.row, isNext && { borderColor: h.base, borderWidth: 2 }, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.dot, { backgroundColor: isDone ? C.leafDeep : open ? h.base : C.paperDeep }]}>
                <Ionicons name={isDone ? 'checkmark' : open ? 'play' : 'lock-closed'} size={18} color={isDone || open ? '#fff' : C.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="caption">{t('chapter.lessonN', { n: i + 1 })}</Txt>
                <Txt variant="strong">{tr(lesson.title)}</Txt>
              </View>
              {isDone && <Txt style={styles.replay}>{t('chapter.replay')}</Txt>}
              {open && <Ionicons name="chevron-forward" size={20} color={C.ink2} />}
            </Pressable>
          );
        })}
      </View>

      {phraseIds.length > 0 && (
        <View style={styles.section}>
          <Txt variant="label">{t('chapter.phrases')}</Txt>
          <View style={styles.chips}>
            {phraseIds.map((pid) => (
              <Pressable
                key={pid}
                onPress={() => router.push(`/phrase/${pid}`)}
                accessibilityRole="button"
                accessibilityLabel={`${PHRASES[pid].lg}, ${tr(PHRASES[pid].tr)}`}
                style={({ pressed }) => [styles.chip, { backgroundColor: h.soft }, pressed && { opacity: 0.8 }]}
              >
                <Txt style={[styles.chipText, { color: h.deep }]}>{PHRASES[pid].lg}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {tipIds.length > 0 && (
        <View style={styles.section}>
          <Txt variant="label">{t('chapter.tips')}</Txt>
          {tipIds.map((tid) => (
            <Pressable key={tid} onPress={() => setTip(TIPS[tid])} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
              <TipIconBadge icon={TIPS[tid].icon} hue={chapter.hue} />
              <Txt variant="strong" style={{ flex: 1 }}>
                {tr(TIPS[tid].title)}
              </Txt>
              <Ionicons name="chevron-forward" size={20} color={C.ink2} />
            </Pressable>
          ))}
        </View>
      )}

      <Sheet visible={tip !== null} onClose={() => setTip(null)}>
        {tip && (
          <>
            <View style={styles.tipHead}>
              <TipIconBadge icon={tip.icon} hue={chapter.hue} size={48} />
              <Txt variant="h2" style={{ flex: 1 }}>
                {tr(tip.title)}
              </Txt>
            </View>
            <Txt variant="body">{tr(tip.body)}</Txt>
            <Button label={t('common.close')} onPress={() => setTip(null)} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: S.xs, paddingTop: S.sm },
  center: { textAlign: 'center' },
  section: { gap: S.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, minHeight: 64 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  replay: { ...F.semi, fontSize: 13, color: C.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, minHeight: 40, justifyContent: 'center' },
  chipText: { ...F.semi, fontSize: 15 },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
