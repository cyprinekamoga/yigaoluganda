import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { UNIT_1 } from '@/content';
import { useT } from '@/i18n';
import { BADGES } from '@/logic/badges';
import { dayKey, lastWeek } from '@/logic/dates';
import { visibleStreak } from '@/logic/progress';
import { isComplete, lessonsDone } from '@/logic/unlock';
import { useApp } from '@/state/store';
import { BadgeMedal } from '@/ui/Badge';
import { Beads } from '@/ui/Beads';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CowrieIcon, DrumIcon } from '@/ui/Icons';
import { Ngaali } from '@/ui/Ngaali';
import { LargeTitleScreen } from '@/ui/LargeTitleScreen';
import { C, F, HUES, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/**
 * "Me": what you can say (phrases learned), where you are in Part 1 (the chapter map),
 * your drumbeat and cowries, your shields, and a nudge to practise with a Luganda speaker you know.
 */
export default function Profile() {
  const { t, tr, lang } = useT();
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const stats = useApp((s) => s.stats);
  const done = useApp((s) => s.done);
  const srs = useApp((s) => s.srs);
  const badges = useApp((s) => s.badges);
  const today = dayKey();
  if (!profile) return null; // between a reset and the redirect to onboarding
  const week = lastWeek(today);
  const weekCount = week.reduce((n, d) => n + (stats.activityByDay[d] ?? 0), 0);
  const letters = t('profile.days').split(',');
  const since = new Date(profile.createdAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const earned = BADGES.filter((b) => badges[b.id]).length;
  const learned = Object.keys(srs).length;
  const totalPhrases = UNIT_1.phrases.length;
  const chaptersDone = UNIT_1.chapters.filter((c) => isComplete(c, done)).length;
  const streak = visibleStreak(stats, today);

  return (
    <LargeTitleScreen
      testID="screen-profile"
      title={t('profile.title')}
      trailing={
        <Pressable testID="open-settings" onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('profile.settings')} style={styles.gear} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={C.ink} />
        </Pressable>
      }
    >
      <View style={styles.head}>
        <Ngaali mood="idle" size={64} />
        <View style={{ flex: 1 }}>
          <Txt variant="h2" numberOfLines={1}>
            {profile.name}
          </Txt>
          <Txt variant="small">{t('profile.since', { date: since })}</Txt>
        </View>
      </View>

      {/* Phrases learned: the main measure of progress. */}
      <Card style={styles.phrases} testID="tile-phrases" accessible accessibilityLabel={`${t('profile.phrases')}: ${learned}. ${t('profile.phrasesOf', { n: learned, total: totalPhrases })}`}>
        <Txt variant="label">{t('profile.phrases')}</Txt>
        <Txt style={styles.bigNumber}>{learned}</Txt>
        <Txt variant="small">{t('profile.phrasesOf', { n: learned, total: totalPhrases })}</Txt>
        <View style={styles.meter}>
          <View style={[styles.meterFill, { width: `${Math.min(100, (learned / Math.max(1, totalPhrases)) * 100)}%` }]} />
        </View>
      </Card>

      <View style={styles.pair}>
        <Card style={styles.small} testID="tile-streak" accessible accessibilityLabel={`${t('profile.streak')}: ${(streak === 1 ? t('profile.streakDaysOne') : t('profile.streakDays', { n: streak }))}. ${t('profile.best', { n: stats.bestStreak })}`}>
          <DrumIcon size={30} off={streak === 0} />
          <Txt style={styles.smallValue}>{streak}</Txt>
          <Txt variant="caption">{t('profile.streak')}</Txt>
          <Txt variant="caption" style={{ color: C.ink3 }}>
            {t('profile.best', { n: stats.bestStreak })}
          </Txt>
        </Card>
        <Card style={styles.small} testID="tile-gems" accessible accessibilityLabel={`${t('profile.gems')}: ${stats.gems}`}>
          <CowrieIcon size={30} />
          <Txt style={styles.smallValue}>{stats.gems}</Txt>
          <Txt variant="caption">{t('profile.gems')}</Txt>
        </Card>
      </View>

      {/* The week, one drum per day. */}
      <Card style={{ gap: S.md }}>
        <View style={styles.rowBetween}>
          <Txt variant="h3">{t('profile.week')}</Txt>
          <Txt variant="small">{weekCount === 1 ? t('profile.weekCountOne') : t('profile.weekCount', { n: weekCount })}</Txt>
        </View>
        <View style={styles.week}>
          {week.map((d) => {
            const n = stats.activityByDay[d] ?? 0;
            const [y, m, dd] = d.split('-').map(Number);
            const letter = letters[new Date(y, m - 1, dd).getDay()];
            const isToday = d === today;
            return (
              <View key={d} style={styles.day} accessible accessibilityLabel={t('profile.dayA11y', { day: d, n })}>
                <Txt variant="caption" style={[isToday && { color: C.ink, ...F.semi }]}>
                  {letter}
                </Txt>
                <View style={[styles.dayDot, n > 0 && styles.dayOn, isToday && styles.dayToday]}>
                  <DrumIcon size={20} off={n === 0} />
                </View>
                <Txt variant="caption">{n > 0 ? n : '–'}</Txt>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Chapter map: one string of beads per chapter, one bead per lesson. */}
      <View style={{ gap: S.sm }}>
        <View style={styles.rowBetween}>
          <Txt variant="label">{t('profile.chapters')}</Txt>
          <Txt variant="small">{t('profile.chaptersDone', { n: chaptersDone, total: UNIT_1.chapters.length })}</Txt>
        </View>
        <Card style={styles.map} testID="chapter-map">
          {UNIT_1.chapters.map((c, i) => {
            const n = lessonsDone(c, done);
            const h = HUES[c.hue];
            return (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/chapter/${c.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${t('home.chapter', { n: c.n })}: ${tr(c.title)}. ${t('home.lessons', { done: n, total: c.lessons.length })}`}
                style={({ pressed }) => [styles.mapRow, i > 0 && styles.mapRule, pressed && { opacity: 0.8 }]}
              >
                <Txt style={[styles.mapN, n > 0 && { color: h.deep }]}>{c.n}</Txt>
                <Txt variant="strong" style={{ flex: 1 }} numberOfLines={1}>
                  {c.lgTitle}
                </Txt>
                <Beads total={c.lessons.length} done={n} size={11} color={h.base} />
              </Pressable>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: S.sm }}>
        <View style={styles.rowBetween}>
          <Txt variant="label">{t('profile.badges')}</Txt>
          <Txt variant="small">{t('profile.badgesCount', { n: earned, total: BADGES.length })}</Txt>
        </View>
        <View style={styles.badges}>
          {BADGES.map((b) => (
            <View key={b.id} style={styles.badge} accessible accessibilityLabel={`${t(`badge.${b.id}.title` as never)}. ${t(`badge.${b.id}.desc` as never)}`}>
              <BadgeMedal id={b.id} earned={Boolean(badges[b.id])} size={60} />
              <Txt variant="caption" style={[styles.badgeText, !badges[b.id] && { color: C.ink2 }]} numberOfLines={2}>
                {t(`badge.${b.id}.title` as never)}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {/* Instead of a leaderboard: learn with the people you already know. */}
      <Card style={styles.family} testID="family-card">
        <View style={styles.familyHead}>
          <View style={styles.familyIcon}>
            <Ionicons name="people" size={22} color={C.onNeon} />
          </View>
          <Txt variant="h3" style={{ flex: 1 }}>
            {t('profile.family')}
          </Txt>
        </View>
        <Txt variant="body" style={{ color: C.ink2 }}>
          {t('profile.familyBody')}
        </Txt>
        <Button kind="secondary" label={t('profile.familyCta')} onPress={() => router.navigate('/practice')} />
      </Card>
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  gear: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  phrases: { gap: 4 },
  bigNumber: { ...F.heading, fontSize: 44, lineHeight: 50, color: C.neon },
  meter: { height: 6, borderRadius: 3, backgroundColor: C.paperDeep, marginTop: S.sm, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: C.neon },
  pair: { flexDirection: 'row', gap: S.sm },
  small: { flex: 1, gap: 2, padding: S.md },
  smallValue: { ...F.semi, fontSize: 26, lineHeight: 32, color: C.ink, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  dayDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paperDeep },
  dayOn: { backgroundColor: C.tomatoSoft },
  dayToday: { borderWidth: 2, borderColor: C.neon },
  map: { paddingVertical: S.xs },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 },
  mapRule: { borderTopWidth: 1, borderTopColor: C.line },
  mapN: { ...F.semi, fontSize: 15, color: C.ink3, width: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', rowGap: S.lg },
  badge: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  badgeText: { textAlign: 'center', color: C.ink, ...F.semi },
  family: { gap: S.md, borderColor: C.neon },
  familyHead: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  familyIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center' },
});
