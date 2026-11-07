import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { audioCount } from '@/audio/engine';
import { DIALOGUES, PHRASES, UNIT_1 } from '@/content';
import { useT } from '@/i18n';
import { dayKey } from '@/logic/dates';
import { dueIds } from '@/logic/srs';
import { useApp } from '@/state/store';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { HeartIcon } from '@/ui/Icons';
import { Ngaali } from '@/ui/Ngaali';
import { Screen } from '@/ui/Screen';
import { StatsBar } from '@/ui/StatsBar';
import { C, F, HUES, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function PracticeLab() {
  const { t, tr } = useT();
  const router = useRouter();
  const srs = useApp((s) => s.srs);
  const done = useApp((s) => s.done);
  const learned = Object.keys(srs);
  const due = dueIds(srs, dayKey(), 50).length;
  const reviewCount = Math.min(8, Math.max(due, Math.min(learned.length, 8)));
  const clips = audioCount();

  // Every roleplay in the unit, in chapter order; playable once its lesson is finished.
  const convos = UNIT_1.chapters.flatMap((c) =>
    c.lessons
      .filter((l) => l.dialogue && DIALOGUES[l.dialogue])
      .map((l, i) => ({ chapter: c, lesson: l, index: c.lessons.indexOf(l), id: l.dialogue!, key: `${l.id}-${i}` })),
  );

  return (
    <Screen testID="screen-practice">
      <View style={styles.top}>
        <Txt variant="title" accessibilityRole="header">
          {t('practice.title')}
        </Txt>
        <StatsBar />
      </View>
      <Txt variant="body" style={{ color: C.ink2 }}>
        {t('practice.subtitle')}
      </Txt>

      {/* Review: spaced repetition, refills hearts */}
      <Card style={styles.review}>
        <View style={styles.reviewRow}>
          <Ngaali mood="think" size={70} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="h2">{t('practice.review')}</Txt>
            {learned.length ? (
              <View style={styles.inline}>
                <HeartIcon size={16} />
                <Txt variant="small">{t('practice.reviewBody', { n: reviewCount })}</Txt>
              </View>
            ) : (
              <Txt variant="small">{t('practice.reviewEmpty')}</Txt>
            )}
          </View>
        </View>
        <Button testID="practice-review" kind="sun" label={t('practice.reviewStart')} disabled={!learned.length} onPress={() => router.push('/practice/review')} />
      </Card>

      {/* Conversations */}
      <View style={styles.section}>
        <Txt variant="label">{t('practice.conversations')}</Txt>
        <Txt variant="small">{t('practice.conversationsBody')}</Txt>
        {convos.map(({ chapter, lesson, index, id, key }) => {
          const open = Boolean(done[lesson.id]);
          const h = HUES[chapter.hue];
          return (
            <Pressable
              key={key}
              testID={`convo-${id}`}
              disabled={!open}
              onPress={() => router.push(`/practice/dialogue?id=${id}`)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !open }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.icon, { backgroundColor: open ? h.soft : C.paperDeep }]}>
                <Ionicons name={open ? 'chatbubbles' : 'lock-closed'} size={20} color={open ? h.deep : C.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="strong">{tr(DIALOGUES[id].title)}</Txt>
                <Txt variant="small" numberOfLines={1}>
                  {open
                    ? tr(DIALOGUES[id].setting)
                    : t('practice.convoLocked', { lesson: `${t('home.chapter', { n: chapter.n })}, ${t('chapter.lessonN', { n: index + 1 })}` })}
                </Txt>
              </View>
              {open && <Ionicons name="play-circle" size={28} color={h.deep} />}
            </Pressable>
          );
        })}
      </View>

      {/* Listening */}
      <View style={styles.section}>
        <Txt variant="label">{t('practice.listening')}</Txt>
        {clips > 0 ? (
          <Card style={{ gap: S.md }}>
            <Txt variant="body">{t('practice.audioCount', { n: clips })}</Txt>
            <Button kind="secondary" label={t('practice.listenStart')} onPress={() => router.push('/practice/listen')} />
          </Card>
        ) : (
          <Card style={styles.note}>
            <Ionicons name="headset" size={22} color={C.ink2} />
            <Txt variant="small" style={{ flex: 1 }}>
              {t('practice.noAudio')}
            </Txt>
          </Card>
        )}
      </View>

      {/* Speaking */}
      <View style={styles.section}>
        <Txt variant="label">{t('practice.speaking')}</Txt>
        <Txt variant="small">{t('practice.speakingBody')}</Txt>
        {learned.length ? (
          <View style={styles.chips}>
            {learned.slice(0, 18).map((pid) => (
              <Pressable
                key={pid}
                onPress={() => router.push(`/practice/speak?id=${pid}`)}
                accessibilityRole="button"
                accessibilityLabel={`${PHRASES[pid].lg}, ${tr(PHRASES[pid].tr)}`}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="mic" size={15} color={C.ink} />
                <Txt style={styles.chipText}>{PHRASES[pid].lg}</Txt>
              </Pressable>
            ))}
          </View>
        ) : (
          <Txt variant="small">{t('practice.reviewEmpty')}</Txt>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: S.sm, paddingTop: S.sm },
  review: { gap: S.md, backgroundColor: '#FFFCF3', borderColor: C.sun, borderWidth: 2 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { gap: S.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, minHeight: 64 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: S.md, alignItems: 'flex-start', backgroundColor: C.paperDeep },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 42, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  chipText: { fontFamily: F.semi, fontSize: 15, color: C.ink },
});
