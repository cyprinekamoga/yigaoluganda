import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { useApp } from '../state/store';
import { C, F, HUES, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { MAIN, useLearners } from './store';

const AVATAR_HUES = [HUES.tomato.base, HUES.neon.base, HUES.blush.base, C.crane, C.craneDark];

/** A round letter avatar: the account holder in tomato, each child in their own colour. */
export function Avatar({ name, index, size = 36 }: { name: string; index: number; size?: number }) {
  const bg = AVATAR_HUES[index % AVATAR_HUES.length];
  const dark = bg === HUES.neon.base || bg === C.crane;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Txt style={[styles.letter, { fontSize: size * 0.45, color: dark ? C.onNeon : C.ink }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Txt>
    </View>
  );
}

/** Who is learning right now, on the home screen. Shown once the account has child profiles. */
export function LearnerChip() {
  const { t } = useT();
  const router = useRouter();
  const children = useLearners((s) => s.children);
  const active = useLearners((s) => s.active);
  const name = useApp((s) => s.profile?.name ?? '');
  if (!children.length) return null;
  const index = active === MAIN ? 0 : 1 + children.findIndex((c) => c.id === active);
  return (
    <Pressable
      testID="learner-chip"
      onPress={() => router.push('/learners')}
      accessibilityRole="button"
      accessibilityLabel={t('learners.chipA11y', { name })}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
    >
      <Avatar name={name} index={index} size={28} />
      <Txt style={styles.chipText} numberOfLines={1}>
        {active === MAIN ? name : t('learners.kidName', { name })}
      </Txt>
      <Ionicons name="swap-horizontal" size={16} color={C.ink2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  letter: { ...F.heading },
  chip: { flexDirection: 'row', alignItems: 'center', gap: S.sm, alignSelf: 'flex-start', paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, minHeight: 40 },
  chipText: { ...F.semi, fontSize: 15, color: C.ink, maxWidth: 220 },
});
