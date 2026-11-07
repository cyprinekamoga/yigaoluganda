import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { dayKey } from '../logic/dates';
import { MAX_HEARTS, nextHeartIn, REFILL_COST, regenHearts, visibleStreak } from '../logic/progress';
import { useApp } from '../state/store';
import { Button } from './Button';
import { FlameIcon, GemIcon, HeartIcon } from './Icons';
import { Sheet } from './Sheet';
import { C, F, R, S } from './theme';
import { Txt } from './Txt';

function Pill({ icon, value, label, onPress, testID }: { icon: React.ReactNode; value: number; label: string; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}
    >
      {icon}
      <Txt style={styles.value}>{value}</Txt>
    </Pressable>
  );
}

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The PRD's top stats bar: streak, gems and hearts. */
export function StatsBar() {
  const { t } = useT();
  const stats = useApp((s) => s.stats);
  const now = useNow();
  const [open, setOpen] = useState(false);
  const hearts = regenHearts(stats, now).hearts;
  const streak = visibleStreak(stats, dayKey(new Date(now)));
  return (
    <View style={styles.bar}>
      <Pill testID="stat-streak" icon={<FlameIcon off={streak === 0} />} value={streak} label={t('stats.streakA11y', { n: streak })} />
      <Pill testID="stat-gems" icon={<GemIcon />} value={stats.gems} label={t('stats.gemsA11y', { n: stats.gems })} />
      <Pill testID="stat-hearts" icon={<HeartIcon off={hearts === 0} />} value={hearts} label={t('stats.heartsA11y', { n: hearts })} onPress={() => setOpen(true)} />
      <HeartsSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

export function formatWait(ms: number, t: ReturnType<typeof useT>['t']) {
  return t('hearts.minutes', { n: Math.max(1, Math.ceil(ms / 60_000)) });
}

export function HeartsSheet({ visible, onClose, out = false }: { visible: boolean; onClose: () => void; out?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const stats = useApp((s) => s.stats);
  const buyRefill = useApp((s) => s.buyRefill);
  const hasCards = useApp((s) => Object.keys(s.srs).length > 0);
  const now = useNow(5_000);
  const r = regenHearts(stats, now);
  const wait = nextHeartIn(stats, now);
  return (
    <Sheet visible={visible} onClose={onClose} testID="hearts-sheet">
      <Txt variant="h2">{out ? t('hearts.outTitle') : t('hearts.title')}</Txt>
      <View style={styles.hearts} accessibilityLabel={t('stats.heartsA11y', { n: r.hearts })}>
        {Array.from({ length: MAX_HEARTS }, (_, i) => (
          <HeartIcon key={i} size={34} off={i >= r.hearts} />
        ))}
      </View>
      <Txt variant="body">{out ? t('hearts.outBody') : r.hearts >= MAX_HEARTS ? t('hearts.full') : t('hearts.body')}</Txt>
      {r.hearts < MAX_HEARTS && <Txt variant="strong">{t('hearts.next', { time: formatWait(wait, t) })}</Txt>}
      {r.hearts < MAX_HEARTS && (
        <View style={{ gap: S.sm }}>
          {hasCards && (
            <Button
              testID="hearts-review"
              label={t('hearts.review')}
              onPress={() => {
                onClose();
                router.push('/practice/review');
              }}
            />
          )}
          <Button
            testID="hearts-buy"
            kind="secondary"
            icon={<GemIcon size={18} />}
            label={stats.gems >= REFILL_COST ? t('hearts.buy', { cost: REFILL_COST }) : t('hearts.notEnough', { have: stats.gems, cost: REFILL_COST })}
            disabled={stats.gems < REFILL_COST}
            onPress={() => {
              if (buyRefill()) onClose();
            }}
          />
        </View>
      )}
      <Button kind="ghost" label={t('common.close')} onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', gap: S.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 40, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  value: { fontFamily: F.semi, fontSize: 16, color: C.ink },
  hearts: { flexDirection: 'row', gap: S.sm },
});
