import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { C, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { useAccount } from './store';

/** On the Me tab, for teachers with a school licence: their classes and the students' progress. */
export function TeacherCard() {
  const { t } = useT();
  const router = useRouter();
  const teaching = useAccount((s) => s.licences.filter((l) => l.teacher).length);
  if (!teaching) return null;
  return (
    <Card style={styles.card} testID="teacher-card">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="school" size={20} color={C.onNeon} />
        </View>
        <Txt variant="h3" style={{ flex: 1 }}>
          {t('teacher.title')}
        </Txt>
      </View>
      <Txt variant="small">{t('teacher.card', { n: teaching })}</Txt>
      <Button testID="open-classes" kind="secondary" label={t('teacher.open')} onPress={() => router.push('/class')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm, borderColor: C.neon },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center' },
});
