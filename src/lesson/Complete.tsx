import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PHRASES } from '../content';
import { useT } from '../i18n';
import type { Reward } from '../state/store';
import { BadgeMedal } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CowrieIcon, PotIcon } from '../ui/Icons';
import { Ngaali } from '../ui/Ngaali';
import { C, F, MAX_W, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { Footer } from './Footer';

/**
 * The end of a lesson: what you can now say, not a score. Lists the phrases the lesson taught
 * (or, for practice, the ones it went over), then the cowries earned and any new shield.
 */
export function Complete({ reward, phrases, practice, onDone }: { reward: Reward; phrases: string[]; practice: boolean; onDone: () => void }) {
  const { t, tr } = useT();
  const badge = reward.badges[0];
  const n = phrases.length;
  const summary = practice ? t('done.practised', { n }) : n === 0 ? t('done.noNew') : n === 1 ? t('done.learnedOne') : t('done.learned', { n });
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="lesson-complete">
      <ScrollView contentContainerStyle={styles.body}>
        <Ngaali mood={badge ? 'badge' : 'correct'} size={120} label={t('mascot.label')} />
        <Txt variant="hero" style={styles.center} accessibilityRole="header">
          {t('done.heading')}
        </Txt>
        <Txt variant="body" style={[styles.center, { color: C.ink2 }]} testID="done-summary">
          {summary}
        </Txt>

        {n > 0 && (
          <Card style={styles.list} testID="done-phrases">
            {phrases.slice(0, 8).map((id, i) => (
              <View key={id} style={[styles.phrase, i > 0 && styles.rule]}>
                <Txt style={styles.lg} accessibilityLanguage="lg">
                  {PHRASES[id].lg}
                </Txt>
                <Txt variant="small" style={{ color: C.ink2 }}>
                  {tr(PHRASES[id].tr)}
                </Txt>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.earned}>
          <View style={styles.pill} testID="done-cowries" accessible accessibilityLabel={t('done.cowries', { n: reward.gems })}>
            <CowrieIcon size={22} />
            <Txt style={styles.pillText}>{t('done.cowries', { n: reward.gems })}</Txt>
          </View>
          {reward.perfect && !practice && (
            <View style={[styles.pill, styles.pillNeon]}>
              <Txt style={[styles.pillText, { color: C.onNeon }]}>{t('done.perfect')}</Txt>
            </View>
          )}
          {reward.heartsRefilled && (
            <View style={styles.pill}>
              <PotIcon size={20} />
              <Txt style={styles.pillText}>{t('done.heartsRefilled')}</Txt>
            </View>
          )}
        </View>

        {reward.badges.map((id) => (
          <Card key={id} style={styles.badge} testID={`new-badge-${id}`}>
            <BadgeMedal id={id} earned size={60} />
            <View style={{ flex: 1 }}>
              <Txt variant="label" style={{ color: C.neon }}>
                {t('done.badge')}
              </Txt>
              <Txt variant="h3">{t(`badge.${id}.title` as never)}</Txt>
              <Txt variant="small">{t(`badge.${id}.desc` as never)}</Txt>
            </View>
          </Card>
        ))}
      </ScrollView>
      <Footer>
        <Button testID="complete-continue" label={t('common.continue')} onPress={onDone} />
      </Footer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  body: { padding: S.lg, gap: S.lg, alignItems: 'center', width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingTop: S.xl },
  center: { textAlign: 'center' },
  list: { alignSelf: 'stretch', paddingVertical: S.sm },
  phrase: { paddingVertical: S.sm, gap: 2 },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
  lg: { ...F.semi, fontSize: 19, color: C.neon },
  earned: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.paperDeep },
  pillNeon: { backgroundColor: C.neon },
  pillText: { ...F.semi, fontSize: 15, color: C.ink },
  badge: { flexDirection: 'row', alignItems: 'center', gap: S.md, alignSelf: 'stretch' },
});
