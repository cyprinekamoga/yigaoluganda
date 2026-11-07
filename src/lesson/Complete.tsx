import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import type { Reward } from '../state/store';
import { BadgeMedal } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GemIcon, HeartIcon, XpIcon } from '../ui/Icons';
import { Ngaali } from '../ui/Ngaali';
import { C, MAX_W, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { Footer } from './Footer';

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon}
      <Txt variant="h2">{value}</Txt>
      <Txt variant="caption">{label}</Txt>
    </Card>
  );
}

export function Complete({ reward, accuracy, practice, onDone }: { reward: Reward; accuracy: number; practice: boolean; onDone: () => void }) {
  const { t } = useT();
  const badge = reward.badges[0];
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="lesson-complete">
      <ScrollView contentContainerStyle={styles.body}>
        <Ngaali mood={badge ? 'badge' : 'correct'} size={140} label={t('mascot.label')} />
        <Txt variant="hero" style={styles.center} accessibilityRole="header">
          {practice ? t('done.titlePractice') : t('done.title')}
        </Txt>
        <View style={styles.tiles}>
          <Tile icon={<XpIcon size={26} />} label={t('done.xp')} value={`+${reward.xp}`} />
          <Tile icon={<GemIcon size={26} />} label={t('done.gems')} value={`+${reward.gems}`} />
          {!practice && <Tile icon={<MaterialCommunityIcons name="bullseye-arrow" size={26} color={C.leafDeep} />} label={t('done.accuracy')} value={`${Math.round(accuracy * 100)}%`} />}
        </View>
        {reward.perfect && !practice && (
          <View style={[styles.banner, { backgroundColor: C.neon }]}>
            <Txt variant="strong" style={{ color: C.onNeon }}>
              {t('done.perfect')}
            </Txt>
          </View>
        )}
        {reward.heartsRefilled && (
          <View style={[styles.banner, { backgroundColor: C.redSoft }]}>
            <HeartIcon size={20} />
            <Txt variant="strong" style={{ color: C.redDeep }}>
              {t('done.heartsRefilled')}
            </Txt>
          </View>
        )}
        {reward.badges.map((id) => (
          <Card key={id} style={styles.badge} testID={`new-badge-${id}`}>
            <BadgeMedal id={id} earned size={56} />
            <View style={{ flex: 1 }}>
              <Txt variant="label" style={{ color: C.sunDeep }}>
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
  body: { padding: S.lg, gap: S.lg, alignItems: 'center', width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingTop: S.xxl },
  center: { textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: S.md, alignSelf: 'stretch' },
  tile: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: S.lg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.lg, alignSelf: 'stretch', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: S.md, alignSelf: 'stretch' },
});
