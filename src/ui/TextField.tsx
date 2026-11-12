import Ionicons from '@expo/vector-icons/Ionicons';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useT } from '../i18n';
import { C, F, R, S } from './theme';
import { Txt } from './Txt';

type FieldProps = Omit<TextInputProps, 'style'> & { label: string; hint?: string };

/** A labelled text input that matches the app: maroon card, neon border while focused. */
export function TextField({ label, hint, onFocus, onBlur, ...input }: FieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Txt variant="strong" nativeID={id}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={id}
        placeholderTextColor={C.ink3}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused]}
      />
      {hint ? <Txt variant="small">{hint}</Txt> : null}
    </View>
  );
}

/**
 * A password input with an eye button. The password is hidden by default; the learner chooses
 * whether to show what they typed, and can hide it again.
 */
export function PasswordField({ label, hint, testID, onFocus, onBlur, ...input }: FieldProps) {
  const { t } = useT();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Txt variant="strong" nativeID={id}>
        {label}
      </Txt>
      <View style={[styles.input, styles.row, focused && styles.focused]}>
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          accessibilityLabelledBy={id}
          placeholderTextColor={C.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          {...input}
          secureTextEntry={!visible}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.bare}
        />
        <Pressable
          testID={testID ? `${testID}-toggle` : 'password-toggle'}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('auth.hide') : t('auth.show')}
          hitSlop={8}
          style={({ pressed }) => [styles.eye, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={visible ? C.neon : C.ink2} />
        </Pressable>
      </View>
      {hint ? <Txt variant="small">{hint}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: S.xs },
  input: { ...F.medium, fontSize: 17, color: C.ink, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 54, outlineWidth: 0 },
  focused: { borderColor: C.neon },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  bare: { ...F.medium, flex: 1, fontSize: 17, color: C.ink, minHeight: 50, outlineWidth: 0 },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
});
