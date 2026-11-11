import { ScrollView, StyleSheet, View } from 'react-native';
import { PHRASES } from '../../content';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { FunFact } from '../../ui/FunFact';
import { Ngaali } from '../../ui/Ngaali';
import { C, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { SpeakerButtons } from '../SpeakerButtons';
import type { ExerciseProps } from '../types';

/** A new phrase, presented before it is tested. Not graded. */
export function IntroStep({ step, onNext }: ExerciseProps<{ kind: 'intro'; phraseId: string }>) {
  const { t, tr } = useT();
  const p = PHRASES[step.phraseId];
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.body}>
        <Ngaali mood="wave" size={60} />
        <Card style={styles.card}>
          <Txt variant="lgBig" testID="intro-lg" accessibilityLanguage="lg">
            {p.lg}
          </Txt>
          <SpeakerButtons id={p.id} autoPlay />
          <View style={styles.rule} />
          <Txt variant="h2" testID="intro-meaning">
            {tr(p.tr)}
          </Txt>
          {p.literal && (
            <Txt variant="body" style={{ color: C.ink2 }}>
              {t('lesson.literally')}: “{tr(p.literal)}”
            </Txt>
          )}
        </Card>
        {p.note && (
          <View style={styles.note}>
            <Txt variant="label">{t('lesson.goodToKnow')}</Txt>
            <Txt variant="body">{tr(p.note)}</Txt>
          </View>
        )}
        {/* Fills the empty space under the card with a fact about Uganda or Buganda. */}
        <View style={styles.fact}>
          <FunFact />
        </View>
      </ScrollView>
      <Footer>
        <Button testID="continue" label={t('common.continue')} onPress={onNext} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.lg, width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1 },
  fact: { marginTop: 'auto', paddingTop: S.sm },
  card: { gap: S.md, padding: S.xl },
  rule: { height: 1, backgroundColor: C.line },
  note: { gap: S.xs, backgroundColor: C.paperDeep, padding: S.lg, borderRadius: R.lg },
});
