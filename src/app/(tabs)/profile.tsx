import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/i18n';
import { BADGES } from '@/logic/badges';
import { dayKey, lastWeek } from '@/logic/dates';
import { visibleStreak } from '@/logic/progress';
import { useApp } from '@/state/store';
import { BadgeMedal } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { FlameIcon, GemIcon, XpIcon } from '@/ui/Icons';
import { Ngaali } from '@/ui/Ngaali';
import { LargeTitleScreen } from '@/ui/LargeTitleScreen';
import { C, F, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

function compact(n: number) {
  return n >= 10_000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n.toLocaleString();
}

function StatTile({ icon, label, value, sub, testID }: { icon: React.ReactNode; label: string; value: number; sub?: string; testID?: string }) {
  return (
    <Card style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`} testID={testID}>
      {icon}
      <Txt style={styles.tileValue}>{compact(value)}</Txt>
      <Txt variant="caption" numberOfLines={1}>
        {label}
      </Txt>
      {sub ? <Txt variant="caption" style={{ color: C.ink2 }}>{sub}</Txt> : null}
    </Card>
  );
}

export default function Profile() {
  const { t, lang } = useT();
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const stats = useApp((s) => s.stats);
  const done = useApp((s) => s.done);
  const srs = useApp((s) => s.srs);
  const badges = useApp((s) => s.badges);
  const today = dayKey();
  if (!profile) return null; // between a reset and the redirect to onboarding
  const week = lastWeek(today);
  const weekXp = week.reduce((n, d) => n + (stats.xpByDay[d] ?? 0), 0);
  const letters = t('profile.days').split(',');
  const since = new Date(profile.createdAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const earned = BADGES.filter((b) => badges[b.id]).length;

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
      <Card style={styles.head}>
        <Ngaali mood="idle" size={64} />
        <View style={{ flex: 1 }}>
          <Txt variant="h2" numberOfLines={1}>
            {profile.name}
          </Txt>
          <Txt variant="small">{t('profile.since', { date: since })}</Txt>
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile testID="tile-streak" icon={<FlameIcon size={26} off={visibleStreak(stats, today) === 0} />} label={t('profile.streak')} value={visibleStreak(stats, today)} sub={t('profile.best', { n: stats.bestStreak })} />
        <StatTile testID="tile-xp" icon={<XpIcon size={26} />} label={t('profile.xp')} value={stats.xp} />
        <StatTile icon={<GemIcon size={26} />} label={t('profile.gems')} value={stats.gems} />
        <StatTile icon={<Ionicons name="book" size={24} color={C.ink} />} label={t('profile.lessons')} value={Object.keys(done).length} />
        <StatTile icon={<Ionicons name="chatbubble-ellipses" size={24} color={C.ink} />} label={t('profile.phrases')} value={Object.keys(srs).length} />
        <StatTile icon={<Ionicons name="ribbon" size={24} color={C.ink} />} label={t('profile.badges')} value={earned} />
      </View>

      <Card style={{ gap: S.md }}>
        <View style={styles.rowBetween}>
          <Txt variant="h3">{t('profile.week')}</Txt>
          <Txt variant="small">{t('profile.weekXp', { n: weekXp })}</Txt>
        </View>
        <View style={styles.week}>
          {week.map((d) => {
            const xp = stats.xpByDay[d] ?? 0;
            const [y, m, dd] = d.split('-').map(Number);
            const letter = letters[new Date(y, m - 1, dd).getDay()];
            const isToday = d === today;
            return (
              <View key={d} style={styles.day} accessible accessibilityLabel={`${d}: ${xp} XP`}>
                <Txt variant="caption" style={[isToday && { color: C.ink, ...F.semi }]}>
                  {letter}
                </Txt>
                <View style={[styles.dayDot, xp > 0 && styles.dayOn, isToday && styles.dayToday]}>
                  <FlameIcon size={20} off={xp === 0} />
                </View>
                <Txt variant="caption">{xp > 0 ? xp : '–'}</Txt>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={{ gap: S.sm }}>
        <View style={styles.rowBetween}>
          <Txt variant="label">{t('profile.badges')}</Txt>
          <Txt variant="small">{t('profile.badgesCount', { n: earned, total: BADGES.length })}</Txt>
        </View>
        <View style={styles.badges}>
          {BADGES.map((b) => (
            <View key={b.id} style={styles.badge} accessible accessibilityLabel={`${t(`badge.${b.id}.title` as never)}. ${t(`badge.${b.id}.desc` as never)}`}>
              <BadgeMedal id={b.id} earned={Boolean(badges[b.id])} size={58} />
              <Txt variant="caption" style={[styles.badgeText, !badges[b.id] && { color: C.ink2 }]} numberOfLines={2}>
                {t(`badge.${b.id}.title` as never)}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Txt variant="label">{t('profile.friends')}</Txt>
        <Card style={{ gap: S.md }}>
          <View style={styles.friendRow}>
            <Txt style={styles.rank}>1</Txt>
            <View style={styles.youDot}>
              <Txt style={styles.youText}>{profile.name.charAt(0).toUpperCase()}</Txt>
            </View>
            <Txt variant="strong" style={{ flex: 1 }}>
              {profile.name} ({t('profile.you')})
            </Txt>
            <Txt variant="strong">{weekXp} XP</Txt>
          </View>
          <Txt variant="small">{t('profile.friendsBody')}</Txt>
        </Card>
      </View>
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  gear: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tile: { width: '31.6%', flexGrow: 1, gap: 2, padding: S.md, alignItems: 'flex-start' },
  tileValue: { ...F.semi, fontSize: 24, lineHeight: 30, color: C.ink },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  dayDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paperDeep },
  dayOn: { backgroundColor: C.tomatoSoft },
  dayToday: { borderWidth: 2, borderColor: C.neon },
  badges: { flexDirection: 'row', flexWrap: 'wrap', rowGap: S.lg },
  badge: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  badgeText: { textAlign: 'center', color: C.ink, ...F.semi },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  rank: { ...F.heading, fontSize: 18, color: C.sunDeep, width: 18 },
  youDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center' },
  youText: { ...F.heading, fontSize: 18, color: C.onNeon },
});
