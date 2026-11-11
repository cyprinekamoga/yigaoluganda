import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { dayKey } from '../logic/dates';
import { MAX_HEARTS, nextHeartIn, REFILL_COST, regenHearts, visibleStreak } from '../logic/progress';
import { useApp } from '../state/store';
import { Button } from './Button';
import { CowrieIcon, DrumIcon, PotIcon } from './Icons';
import { Sheet } from './Sheet';
import { C, F, R, S } from './theme';
import { Txt } from './Txt';

function Segment({ icon, value, label, onPress, testID }: { icon: React.ReactNode; value: number; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.segment, pressed && { opacity: 0.75 }]}>
      {icon}
      <Txt style={styles.value}>{value}</Txt>
    </Pressable>
  );
}

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * The day at a glance, in one capsule: water pots, drumbeat and cowries.
 * Any part opens the water-pots sheet, which explains all three.
 */
export function StatsBar() {
  const { t } = useT();
  const stats = useApp((s) => s.stats);
  const now = useNow();
  const [open, setOpen] = useState(false);
  const pots = regenHearts(stats, now).hearts;
  const beat = visibleStreak(stats, dayKey(new Date(now)));
  const show = () => setOpen(true);
  return (
    <View style={styles.capsule}>
      <Segment testID="stat-hearts" icon={<PotIcon size={19} off={pots === 0} />} value={pots} label={t('stats.heartsA11y', { n: pots })} onPress={show} />
      <View style={styles.divider} />
      <Segment testID="stat-streak" icon={<DrumIcon size={19} off={beat === 0} />} value={beat} label={t('stats.streakA11y', { n: beat })} onPress={show} />
      <View style={styles.divider} />
      <Segment testID="stat-gems" icon={<CowrieIcon size={19} />} value={stats.gems} label={t('stats.gemsA11y', { n: stats.gems })} onPress={show} />
      <PotsSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

export function formatWait(ms: number, t: ReturnType<typeof useT>['t']) {
  return t('hearts.minutes', { n: Math.max(1, Math.ceil(ms / 60_000)) });
}

/** Water pots: how many are full, when the next fills, and how to fill them. */
export function PotsSheet({ visible, onClose, out = false }: { visible: boolean; onClose: () => void; out?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const stats = useApp((s) => s.stats);
  const buyRefill = useApp((s) => s.buyRefill);
  const hasCards = useApp((s) => Object.keys(s.srs).length > 0);
  const now = useNow(5_000);
  const r = regenHearts(stats, now);
  const wait = nextHeartIn(stats, now);
  const drumDays = visibleStreak(stats, dayKey(new Date(now)));
  return (
    <Sheet visible={visible} onClose={onClose} testID="hearts-sheet">
      <Txt variant="h2">{out ? t('hearts.outTitle') : t('hearts.title')}</Txt>
      <View style={styles.hearts} accessibilityLabel={t('stats.heartsA11y', { n: r.hearts })}>
        {Array.from({ length: MAX_HEARTS }, (_, i) => (
          <PotIcon key={i} size={40} off={i >= r.hearts} />
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
            icon={<CowrieIcon size={18} />}
            label={stats.gems >= REFILL_COST ? t('hearts.buy', { cost: REFILL_COST }) : t('hearts.notEnough', { have: stats.gems, cost: REFILL_COST })}
            disabled={stats.gems < REFILL_COST}
            onPress={() => {
              if (buyRefill()) onClose();
            }}
          />
        </View>
      )}
      {!out && (
        <View style={styles.extra}>
          <View style={styles.extraRow}>
            <DrumIcon size={24} off={drumDays === 0} />
            <Txt variant="small" style={{ flex: 1 }}>
              {drumDays === 1 ? t('hearts.drumOne', { best: stats.bestStreak }) : t('hearts.drum', { n: drumDays, best: stats.bestStreak })}
            </Txt>
          </View>
          <View style={styles.extraRow}>
            <CowrieIcon size={24} />
            <Txt variant="small" style={{ flex: 1 }}>
              {t('hearts.cowries', { n: stats.gems })} · {t('hearts.cowriesHint')}
            </Txt>
          </View>
        </View>
      )}
      <Button kind="ghost" label={t('common.close')} onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  capsule: { flexDirection: 'row', alignItems: 'center', borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 4 },
  segment: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, minHeight: 36 },
  divider: { width: 1, height: 18, backgroundColor: C.line },
  extra: { gap: S.sm, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.line },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  value: { ...F.semi, fontSize: 15, color: C.ink },
  hearts: { flexDirection: 'row', gap: S.sm },
});
