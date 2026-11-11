import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { hasAudio, playClip } from '../audio/engine';
import { useT } from '../i18n';
import { C, F, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';

/**
 * Normal and 0.75× playback of a native recording. The slow button says "mpola" (Luganda for
 * "slowly"). Renders nothing when there is no recording.
 */
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
        style={({ pressed }) => [styles.slow, { height: size * 0.66, paddingHorizontal: size * 0.26 }, pressed && styles.pressed]}
      >
        <Txt style={[styles.slowText, { fontSize: Math.round(size * 0.24) }]}>mpola</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  btn: { backgroundColor: C.tomato, alignItems: 'center', justifyContent: 'center' },
  slow: { borderWidth: 2, borderColor: C.neon, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  slowText: { ...F.semi, color: C.neon, letterSpacing: 0.4 },
  pressed: { transform: [{ scale: 0.94 }] },
});
