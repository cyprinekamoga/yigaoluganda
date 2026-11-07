import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, F, R } from './theme';
import { Txt } from './Txt';
import { tapFeedback } from '../audio/feedback';

type Kind = 'primary' | 'dark' | 'secondary' | 'success' | 'danger' | 'ghost' | 'neon';

const KIND: Record<Kind, { bg: string; fg: string; border?: string }> = {
  primary: { bg: C.tomato, fg: C.onTomato },
  dark: { bg: C.paperDeep, fg: C.ink },
  secondary: { bg: C.card, fg: C.ink, border: C.line },
  success: { bg: C.neon, fg: C.onNeon },
  danger: { bg: C.tomato, fg: C.onTomato },
  ghost: { bg: 'transparent', fg: C.ink2 },
  neon: { bg: C.neon, fg: C.onNeon },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  small?: boolean;
  accessibilityHint?: string;
}

export function Button({ label, onPress, kind = 'primary', disabled, loading, icon, style, testID, small, accessibilityHint }: ButtonProps) {
  const k = KIND[kind];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled || loading}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: k.bg, borderColor: k.border ?? k.bg, borderWidth: k.border ? 1.5 : 0 },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={k.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Txt style={[styles.label, small && styles.smallLabel, { color: disabled ? C.ink3 : k.fg }]} numberOfLines={1}>
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  small: { minHeight: 42, paddingHorizontal: 14, borderRadius: R.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...F.heading, fontSize: 18, lineHeight: 22, letterSpacing: 0.2 },
  smallLabel: { fontSize: 15, lineHeight: 19 },
  disabled: { backgroundColor: C.paperDeep, borderColor: C.paperDeep },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
});
