import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { hasAudio, playClip } from '../audio/engine';
import { useT } from '../i18n';
import { C, R, S } from '../ui/theme';

/** Normal and 0.75× "turtle" playback of a native recording. Renders nothing when there is no recording. */
export function SpeakerButtons({ id, big = false, autoPlay = false }: { id: string; big?: boolean; autoPlay?: boolean }) {
  const { t } = useT();
  const available = hasAudio(id);
  useEffect(() => {
    if (available && autoPlay) playClip(id);
  }, [id, available, autoPlay]);
  if (!available) return null;
  const size = big ? 76 : 52;
  return (
    <View style={styles.row}>
      <Pressable
        testID="play-normal"
        accessibilityRole="button"
        accessibilityLabel={`${t('lesson.play')}: ${t('lesson.normal')}`}
        onPress={() => playClip(id)}
        style={({ pressed }) => [styles.btn, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed]}
      >
        <Ionicons name="volume-high" size={size * 0.48} color={C.onTomato} />
      </Pressable>
      <Pressable
        testID="play-slow"
        accessibilityRole="button"
        accessibilityLabel={`${t('lesson.play')}: ${t('lesson.slow')}`}
        onPress={() => playClip(id, true)}
        style={({ pressed }) => [styles.slow, { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 }, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="turtle" size={size * 0.42} color={C.onNeon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  btn: { backgroundColor: C.tomato, alignItems: 'center', justifyContent: 'center' },
  slow: { backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  pressed: { transform: [{ scale: 0.94 }] },
});
