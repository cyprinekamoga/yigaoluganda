import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FACTS } from '../content';
import { useT } from '../i18n';
import { useApp } from '../state/store';
import { C, R, S } from './theme';
import { Txt } from './Txt';

/** "Did you know?" — a fun fact about Uganda or Buganda. Facts rotate in order across lessons. */
export function FunFact() {
  const { t, tr } = useT();
  // Pick once when the card appears, so it doesn't change while the learner reads it.
  const [index] = useState(() => useApp.getState().takeFact(FACTS.length));
  const fact = FACTS[index];
  if (!fact) return null;
  return (
    <View style={styles.card} testID="fun-fact" accessible accessibilityLabel={`${t('lesson.didYouKnow')} ${tr(fact.text)}`}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="earth" size={22} color={C.neon} />
      </View>
      <View style={styles.text}>
        <Txt variant="label" style={{ color: C.neon }}>
          {t('lesson.didYouKnow')}
        </Txt>
        <Txt variant="body" style={{ color: C.ink }}>
          {tr(fact.text)}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: S.md, padding: S.lg, borderRadius: R.lg, alignItems: 'flex-start', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.neon },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(205,247,61,0.14)' },
  text: { flex: 1, gap: S.xs },
});
