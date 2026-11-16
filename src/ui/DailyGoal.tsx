import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT, type Key } from '../i18n';
import { dayKey } from '../logic/dates';
import { GOALS, goalOf } from '../logic/goal';
import { useApp } from '../state/store';
import { Beads } from './Beads';
import { Button } from './Button';
import { Card } from './Card';
import { Sheet } from './Sheet';
import { C, F, R, S } from './theme';
import { Txt } from './Txt';

const GOAL_KEY: Record<number, [Key, Key]> = {
  1: ['goal.one', 'goal.oneHint'],
  2: ['goal.two', 'goal.twoHint'],
  3: ['goal.three', 'goal.threeHint'],
};

/** The three goals to choose from. */
export function GoalPicker({ onPicked }: { onPicked?: () => void }) {
  const { t } = useT();
  const goal = useApp((s) => goalOf(s.settings.goal));
  const setSetting = useApp((s) => s.setSetting);
  return (
    <View style={{ gap: S.xs }} accessibilityRole="radiogroup">
      {GOALS.map((g) => (
        <Pressable
          key={g}
          testID={`goal-${g}`}
          onPress={() => {
            setSetting('goal', g);
            onPicked?.();
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: goal === g }}
          style={[styles.option, goal === g && styles.optionOn]}
        >
          <Ionicons name={goal === g ? 'radio-button-on' : 'radio-button-off'} size={20} color={goal === g ? C.neon : C.ink3} />
          <View style={{ flex: 1 }}>
            <Txt variant="strong">{t(GOAL_KEY[g][0])}</Txt>
            <Txt variant="small">{t(GOAL_KEY[g][1])}</Txt>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** On the home screen: today's lessons against the daily goal. Tap to change the goal. */
export function DailyGoalCard() {
  const { t } = useT();
  const goal = useApp((s) => goalOf(s.settings.goal));
  const count = useApp((s) => s.stats.activityByDay[dayKey()] ?? 0);
  const [open, setOpen] = useState(false);
  const reached = count >= goal;
  return (
    <>
      <Pressable
        testID="daily-goal"
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('goal.title')}: ${t('goal.progress', { n: Math.min(count, goal), goal })}. ${t('goal.change')}`}
      >
        <Card style={[styles.card, reached && styles.cardDone]}>
          <View style={[styles.badge, reached && styles.badgeDone]}>
            <Ionicons name={reached ? 'checkmark' : 'flag'} size={20} color={reached ? C.onNeon : C.ink} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="strong">{reached ? t('goal.reached') : t('goal.title')}</Txt>
            <Beads total={goal} done={Math.min(count, goal)} size={12} />
          </View>
          <Txt style={styles.count} testID="daily-goal-count">
            {Math.min(count, goal)}/{goal}
          </Txt>
        </Card>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} testID="goal-sheet">
        <Txt variant="h2">{t('goal.pick')}</Txt>
        <Txt variant="small">{t('goal.pickBody')}</Txt>
        <GoalPicker onPicked={() => setOpen(false)} />
        <Button kind="ghost" label={t('common.close')} onPress={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  cardDone: { borderColor: C.neon },
  badge: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.paperDeep, alignItems: 'center', justifyContent: 'center' },
  badgeDone: { backgroundColor: C.neon },
  count: { ...F.semi, fontSize: 18, color: C.ink },
  option: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 56, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  optionOn: { borderColor: C.neon, backgroundColor: C.paperDeep },
});
