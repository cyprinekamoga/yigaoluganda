import { ScrollView, StyleSheet, View } from 'react-native';
import { TIPS } from '../../content';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Ngaali } from '../../ui/Ngaali';
import { TipIconBadge } from '../../ui/TipIcon';
import { C, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import type { ExerciseProps } from '../types';

/** Cultural tip card (PRD: non-graded info card about Buganda customs and etiquette). */
export function TipStep({ step, onNext }: ExerciseProps<{ kind: 'tip'; tipId: string }>) {
  const { t, tr } = useT();
  const tip = TIPS[step.tipId];
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.mascot}>
          <Ngaali mood="think" size={96} />
        </View>
        <Card style={styles.card} testID="tip-card">
          <View style={styles.head}>
            <TipIconBadge icon={tip.icon} hue="sun" size={44} />
            <Txt variant="label" style={{ color: C.sunDeep }}>
              {t('lesson.cultureTip')}
            </Txt>
          </View>
          <Txt variant="h2">{tr(tip.title)}</Txt>
          <Txt variant="body">{tr(tip.body)}</Txt>
        </Card>
      </ScrollView>
      <Footer>
        <Button testID="continue" label={t('common.continue')} onPress={onNext} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  mascot: { alignItems: 'center' },
  card: { gap: S.md, padding: S.xl, borderColor: C.sun, borderWidth: 2, backgroundColor: '#FFFDF6' },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
