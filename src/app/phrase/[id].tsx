import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { CHAPTERS, PHRASES, TAUGHT_IN, UNIT_1 } from '@/content';
import { useT } from '@/i18n';
import { SpeakerButtons } from '@/lesson/SpeakerButtons';
import { loose } from '@/logic/search';
import { MAX_BOX } from '@/logic/srs';
import { optionForm } from '@/logic/text';
import { useApp } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { C, HUES, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

export default function PhraseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, tr } = useT();
  const card = useApp((s) => s.srs[id ?? '']);
  const name = useApp((s) => s.profile?.name ?? '');
  const p = PHRASES[id ?? ''];
  if (!p) return <Screen header={<BackBar />}><Txt>404</Txt></Screen>;

  const taught = TAUGHT_IN[p.id];
  const chapter = taught ? CHAPTERS[taught.chapterId] : null;
  const key = loose(optionForm(p.lg));
  const examples = UNIT_1.sentences.filter((s) => ` ${loose(s.lg)} `.includes(` ${key} `) && loose(s.lg) !== key).slice(0, 4);
  const box = card?.box ?? 0;

  return (
    <Screen header={<BackBar />} testID="screen-phrase">
      <Card style={styles.hero}>
        <Txt variant="lgBig" testID="phrase-lg">
          {p.lg}
        </Txt>
        <SpeakerButtons id={p.id} />
        <Txt variant="h2">{tr(p.tr)}</Txt>
        {p.literal && (
          <Txt variant="body" style={{ color: C.ink2 }}>
            {t('lesson.literally')}: “{tr(p.literal)}”
          </Txt>
        )}
      </Card>
      {p.note && (
        <View style={styles.note}>
          <Txt variant="label">{t('lesson.goodToKnow')}</Txt>
          <Txt variant="body">{tr(p.note)}</Txt>
        </View>
      )}

      <View style={styles.section}>
        <Txt variant="label">{t('phrase.memory')}</Txt>
        <View style={styles.meter} accessibilityLabel={card ? `${t('phrase.memory')}: ${box} / ${MAX_BOX}` : t('phrase.notLearned')}>
          {Array.from({ length: MAX_BOX }, (_, i) => (
            <View key={i} style={[styles.seg, { backgroundColor: i < box ? C.leaf : C.leafSoft }]} />
          ))}
        </View>
        <Txt variant="small">{card ? `${t('phrase.learned')} · ${box}/${MAX_BOX}` : t('phrase.notLearned')}</Txt>
      </View>

      {chapter && (
        <Pressable onPress={() => router.push(`/chapter/${chapter.id}`)} accessibilityRole="link" style={[styles.chapter, { backgroundColor: HUES[chapter.hue].soft }]}>
          <Txt variant="strong" style={{ color: HUES[chapter.hue].deep }}>
            {t('phrase.taughtIn', { n: chapter.n, title: tr(chapter.title) })}
          </Txt>
        </Pressable>
      )}

      {examples.length > 0 && (
        <View style={styles.section}>
          <Txt variant="label">{t('phrase.examples')}</Txt>
          {examples.map((s) => (
            <Card key={s.id} style={{ gap: 2, padding: S.md }}>
              <Txt variant="strong">{s.lg.replace(/\{name\}/g, name)}</Txt>
              <Txt variant="small">{tr(s.tr).replace(/\{name\}/g, name)}</Txt>
            </Card>
          ))}
        </View>
      )}

      <Button kind="secondary" label={t('practice.speaking')} onPress={() => router.push(`/practice/speak?id=${p.id}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: S.md, padding: S.xl },
  note: { gap: S.xs, backgroundColor: C.paperDeep, padding: S.lg, borderRadius: R.lg },
  section: { gap: S.sm },
  meter: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 10, borderRadius: 5 },
  chapter: { padding: S.lg, borderRadius: R.lg },
});
