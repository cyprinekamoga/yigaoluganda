import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Lang } from '@/content/types';
import { deviceLang, translate } from '@/i18n';
import { useApp } from '@/state/store';
import { Button } from '@/ui/Button';
import { Ngaali } from '@/ui/Ngaali';
import { Screen } from '@/ui/Screen';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: 'EN' },
  { id: 'sv', label: 'Svenska', flag: 'SV' },
];

export default function Onboarding() {
  const router = useRouter();
  const start = useApp((s) => s.start);
  const [lang, setLang] = useState<Lang>(useApp.getState().profile?.lang ?? deviceLang());
  const [name, setName] = useState('');
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string>) => translate(lang, k, v);

  const go = () => {
    if (!name.trim()) return;
    start(name, lang);
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} testID="screen-onboarding" contentStyle={styles.col}>
        <View style={styles.hero}>
          <Ngaali mood="wave" size={130} label={t('mascot.label')} />
          <Txt variant="hero" style={styles.center}>
            {t('onb.hello')}
          </Txt>
          <Txt variant="body" style={[styles.center, { color: C.ink2 }]}>
            {t('onb.intro')}
          </Txt>
        </View>

        <View style={styles.block}>
          <Txt variant="h3">{t('onb.pickLang')}</Txt>
          <View style={styles.langs} accessibilityRole="radiogroup">
            {LANGS.map((l) => {
              const on = l.id === lang;
              return (
                <Pressable
                  key={l.id}
                  testID={`lang-${l.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setLang(l.id)}
                  style={[styles.lang, on && styles.langOn]}
                >
                  <View style={[styles.code, on && { backgroundColor: C.ink }]}>
                    <Txt style={[styles.codeText, on && { color: C.neon }]}>{l.flag}</Txt>
                  </View>
                  <Txt variant="strong">{l.label}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <Txt variant="h3" nativeID="name-label">
            {t('onb.name')}
          </Txt>
          <TextInput
            testID="name-input"
            accessibilityLabelledBy="name-label"
            accessibilityLabel={t('onb.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('onb.namePlaceholder')}
            placeholderTextColor={C.ink3}
            style={styles.input}
            maxLength={24}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={go}
          />
          <Txt variant="small">{t('onb.nameHint')}</Txt>
        </View>

        <Button testID="onb-go" label={t('onb.go')} onPress={go} disabled={!name.trim()} />
        <Txt variant="small" style={styles.center}>
          {t('onb.privacy')}
        </Txt>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  col: { paddingTop: S.xl, gap: S.xl },
  hero: { alignItems: 'center', gap: S.sm },
  center: { textAlign: 'center' },
  block: { gap: S.sm },
  langs: { flexDirection: 'row', gap: S.md },
  lang: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  langOn: { borderColor: C.ink },
  code: { width: 40, height: 32, borderRadius: 8, backgroundColor: C.paperDeep, alignItems: 'center', justifyContent: 'center' },
  codeText: { ...F.heading, fontSize: 15, color: C.ink },
  input: { ...F.medium, fontSize: 18, color: C.ink, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 54 },
});
