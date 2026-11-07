import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { C, MAX_W, S } from './theme';
import { Txt } from './Txt';

export function BackBar({ title, right }: { title?: string; right?: React.ReactNode }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <View style={styles.bar}>
      <Pressable
        testID="back"
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={10}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="arrow-back" size={24} color={C.ink} />
      </Pressable>
      {title ? (
        <Txt variant="h3" style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Txt>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.sm, paddingVertical: S.xs, gap: S.sm },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  title: { flex: 1 },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
