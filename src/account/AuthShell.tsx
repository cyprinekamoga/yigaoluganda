import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useApp } from '../state/store';
import { Ngaali } from '../ui/Ngaali';
import { Screen } from '../ui/Screen';
import { C, S } from '../ui/theme';
import { Txt } from '../ui/Txt';

/**
 * Frame for the account screens: Ngaali, a title and a short line, then the form.
 * Links from the landing page carry ?lang=sv or ?lang=en, which sets the app's language.
 */
export function AuthShell({ title, lead, mood = 'wave', testID, children }: { title: string; lead?: string; mood?: 'wave' | 'idle' | 'think' | 'correct'; testID: string; children: React.ReactNode }) {
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const setLang = useApp((s) => s.setLang);
  useEffect(() => {
    if (lang === 'sv' || lang === 'en') setLang(lang);
  }, [lang, setLang]);

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} testID={testID} contentStyle={styles.col}>
        <View style={styles.head}>
          <Ngaali mood={mood} size={96} />
          <Txt variant="title" style={styles.center} accessibilityRole="header">
            {title}
          </Txt>
          {lead ? (
            <Txt variant="body" style={[styles.center, { color: C.ink2 }]}>
              {lead}
            </Txt>
          ) : null}
        </View>
        {children}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** A message under a form: an error in tomato, or a notice in neon. */
export function FormMessage({ text, tone = 'error' }: { text: string | null; tone?: 'error' | 'ok' }) {
  if (!text) return null;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.msg, { borderColor: tone === 'error' ? C.tomato : C.neon }]} testID={tone === 'error' ? 'form-error' : 'form-ok'}>
      <Txt variant="body" style={{ color: tone === 'error' ? C.tomatoDeep : C.neon }}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.paper },
  col: { paddingTop: S.lg, gap: S.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  head: { alignItems: 'center', gap: S.sm },
  center: { textAlign: 'center' },
  msg: { borderWidth: 1.5, borderRadius: 12, padding: S.md, backgroundColor: C.card },
});
