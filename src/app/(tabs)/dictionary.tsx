import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { hasAudio } from '@/audio/engine';
import { PHRASES, ROOTS, UNIT_1, type Situation } from '@/content';
import { useT } from '@/i18n';
import { matches } from '@/logic/search';
import { useApp } from '@/state/store';
import { Card } from '@/ui/Card';
import { LargeTitleScreen } from '@/ui/LargeTitleScreen';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const ORDER: Situation[] = ['greet', 'polite', 'elders', 'leaving', 'intro', 'me', 'family', 'asking', 'feelings', 'stuck', 'around', 'table', 'sounds'];

export default function Dictionary() {
  const { t, tr, lang } = useT();
  const router = useRouter();
  const srs = useApp((s) => s.srs);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'phrases' | 'roots'>('phrases');
  const [focused, setFocused] = useState(false);

  const groups = useMemo(() => {
    const hits = UNIT_1.phrases.filter((p) => matches(q, p.lg, p.tr[lang], ...(p.variants ?? [])));
    return ORDER.map((sit) => ({ sit, items: hits.filter((p) => p.category === sit) })).filter((g) => g.items.length);
  }, [q, lang]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <LargeTitleScreen testID="screen-dictionary" title={t('dict.title')}>
      <View style={[styles.search, focused && { borderColor: C.ink }]}>
        <Ionicons name="search" size={20} color={C.ink2} />
        <TextInput
          testID="dict-search"
          value={q}
          onChangeText={setQ}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('dict.search')}
          placeholderTextColor={C.ink3}
          accessibilityLabel={t('dict.search')}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>
      <View style={styles.seg} accessibilityRole="tablist">
        {(['phrases', 'roots'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
            style={[styles.segBtn, tab === k && styles.segOn]}
          >
            <Txt style={[styles.segText, tab === k && { color: C.onInk }]}>{k === 'phrases' ? t('dict.phrases') : t('dict.roots')}</Txt>
          </Pressable>
        ))}
      </View>

      {tab === 'phrases' ? (
        <>
          <Txt variant="small">{q ? (total ? t('dict.count', { n: total }) : t('dict.noResults', { q })) : t('dict.count', { n: UNIT_1.phrases.length })}</Txt>
          {groups.map(({ sit, items }) => (
            <View key={sit} style={styles.group}>
              <Txt variant="label">{t(`sit.${sit}`)}</Txt>
              <Card style={styles.list}>
                {items.map((p, i) => (
                  <Pressable
                    key={p.id}
                    testID={`dict-${p.id}`}
                    onPress={() => router.push(`/phrase/${p.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.lg}, ${tr(p.tr)}`}
                    style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: C.paper }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Txt style={styles.lg}>{p.lg}</Txt>
                      <Txt variant="small">{tr(p.tr)}</Txt>
                    </View>
                    {srs[p.id] && <Ionicons name="checkmark-circle" size={18} color={C.leafDeep} accessibilityLabel={t('phrase.learned')} />}
                    {hasAudio(p.id) && <Ionicons name="volume-high" size={18} color={C.ink2} />}
                    <Ionicons name="chevron-forward" size={18} color={C.ink3} />
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}
        </>
      ) : (
        <>
          <Txt variant="small">{t('dict.rootsIntro')}</Txt>
          {ROOTS.filter((r) => matches(q, r.form, r.meaning[lang], ...r.examples.map((id) => PHRASES[id].lg))).map((r) => (
            <Card key={r.id} style={{ gap: S.sm }}>
              <View style={styles.rootHead}>
                <View style={styles.form}>
                  <Txt style={styles.formText}>{r.form}</Txt>
                </View>
                <Txt variant="strong" style={{ flex: 1 }}>
                  {tr(r.meaning)}
                </Txt>
              </View>
              <Txt variant="body">{tr(r.explain)}</Txt>
              <View style={styles.chips}>
                {r.examples.map((id) => (
                  <Pressable key={id} onPress={() => router.push(`/phrase/${id}`)} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}>
                    <Txt style={styles.chipText}>{PHRASES[id].lg}</Txt>
                  </Pressable>
                ))}
              </View>
            </Card>
          ))}
        </>
      )}
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.md, minHeight: 50 },
  input: { flex: 1, ...F.body, fontSize: 16, color: C.ink, minHeight: 48, outlineWidth: 0 },
  seg: { flexDirection: 'row', backgroundColor: C.paperDeep, borderRadius: R.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 42, borderRadius: R.sm + 2, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.ink },
  segText: { ...F.semi, fontSize: 15, color: C.ink },
  group: { gap: S.sm },
  list: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md, minHeight: 60 },
  rowLine: { borderTopWidth: 1, borderTopColor: C.line },
  lg: { ...F.semi, fontSize: 17, color: C.ink },
  rootHead: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  form: { backgroundColor: C.ink, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 6 },
  formText: { ...F.semi, fontSize: 17, color: C.neon },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { paddingHorizontal: 12, minHeight: 38, justifyContent: 'center', borderRadius: R.pill, backgroundColor: C.tomatoSoft },
  chipText: { ...F.semi, fontSize: 14, color: C.tomatoDeep },
});
