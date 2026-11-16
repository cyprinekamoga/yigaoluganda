import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT, type Key } from '../i18n';
import { C, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { FormMessage } from './AuthShell';
import { googleAvailable, mountGoogleButton } from './google';

/**
 * "Continue with Google", above the e-mail form on sign-up and log-in, with an "or" line under it.
 * Shown only where Google sign-in is set up (the web, with a Google client id).
 */
export function GoogleButton({ mode }: { mode: 'signup' | 'signin' }) {
  const { t, lang } = useT();
  const box = useRef<React.ComponentRef<typeof View>>(null);
  const [error, setError] = useState<Key | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!googleAvailable || !box.current) return;
    let live = true;
    // On the web a View is a <div>, which Google's script fills with its button.
    mountGoogleButton(box.current as unknown as HTMLElement, { lang, text: mode === 'signup' ? 'signup_with' : 'continue_with' }, (r) => {
      if (!live) return;
      if ('unavailable' in r) setHidden(true);
      else setError(r.ok ? null : r.error);
    });
    return () => {
      live = false;
    };
  }, [lang, mode]);

  if (!googleAvailable || hidden) return null;
  return (
    <View style={styles.wrap}>
      <View ref={box} testID="google-button" style={styles.box} />
      <FormMessage text={error ? t(error) : null} />
      <View style={styles.or} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.line} />
        <Txt variant="small">{t('auth.or')}</Txt>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.md },
  box: { minHeight: 44, alignItems: 'center', justifyContent: 'center', width: '100%' },
  or: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  line: { flex: 1, height: 1, backgroundColor: C.line },
});
