import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import type { Lang } from '@/content/types';
import { useT } from '@/i18n';
import { useApp } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function Settings() {
  const { t, lang } = useT();
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const setLang = useApp((s) => s.setLang);
  const setName = useApp((s) => s.setName);
  const setSetting = useApp((s) => s.setSetting);
  const reset = useApp((s) => s.reset);
  const [name, setLocalName] = useState(profile?.name ?? '');
  const [confirm, setConfirm] = useState(false);

  const saveName = () => {
    if (name.trim()) setName(name);
    else setLocalName(profile?.name ?? '');
  };

  return (
    <Screen header={<BackBar title={t('settings.title')} />} testID="screen-settings">
      <View style={styles.section}>
        <Txt variant="label">{t('settings.language')}</Txt>
        <View style={styles.seg} accessibilityRole="radiogroup">
          {(['en', 'sv'] as Lang[]).map((l) => (
            <Pressable
              key={l}
              testID={`settings-lang-${l}`}
              onPress={() => setLang(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected: lang === l }}
              style={[styles.segBtn, lang === l && styles.segOn]}
            >
              <Txt style={[styles.segText, lang === l && { color: C.onInk }]}>{l === 'en' ? 'English' : 'Svenska'}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Txt variant="label" nativeID="settings-name">
          {t('settings.name')}
        </Txt>
        <TextInput
          testID="settings-name"
          accessibilityLabel={t('settings.name')}
          value={name}
          onChangeText={setLocalName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          maxLength={24}
          style={styles.input}
          autoCorrect={false}
        />
      </View>

      <Card style={{ gap: S.md }}>
        <View style={styles.switchRow}>
          <Txt variant="strong" style={{ flex: 1 }}>
            {t('settings.sfx')}
          </Txt>
          <Switch
            accessibilityLabel={t('settings.sfx')}
            value={settings.sfx}
            onValueChange={(v) => setSetting('sfx', v)}
            trackColor={{ true: C.leaf, false: C.line }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.switchRow}>
          <Txt variant="strong" style={{ flex: 1 }}>
            {t('settings.haptics')}
          </Txt>
          <Switch
            accessibilityLabel={t('settings.haptics')}
            value={settings.haptics}
            onValueChange={(v) => setSetting('haptics', v)}
            trackColor={{ true: C.leaf, false: C.line }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Card style={{ gap: S.sm }}>
        <Txt variant="h3">{t('settings.about')}</Txt>
        <Txt variant="body">{t('settings.aboutBody')}</Txt>
        <Txt variant="h3" style={{ marginTop: S.sm }}>
          {t('settings.privacy')}
        </Txt>
        <Txt variant="body">{t('settings.privacyBody')}</Txt>
        <Txt variant="small" style={{ marginTop: S.sm }}>
          {t('settings.version', { v: Constants.expoConfig?.version ?? '2.0.0' })}
        </Txt>
      </Card>

      <Button testID="reset" kind="secondary" label={t('settings.reset')} onPress={() => setConfirm(true)} />

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Txt variant="h2">{t('settings.reset')}</Txt>
        <Txt variant="body">{t('settings.resetBody')}</Txt>
        <Button
          testID="reset-confirm"
          kind="danger"
          label={t('settings.resetConfirm')}
          onPress={() => {
            setConfirm(false);
            reset();
            router.replace('/onboarding');
          }}
        />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.sm },
  seg: { flexDirection: 'row', backgroundColor: C.paperDeep, borderRadius: R.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: R.sm + 2, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.ink },
  segText: { ...F.semi, fontSize: 15, color: C.ink },
  input: { ...F.medium, fontSize: 17, color: C.ink, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 52 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 },
});
