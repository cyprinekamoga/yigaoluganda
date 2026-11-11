import { StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { PotIcon } from '../ui/Icons';
import { C, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import type { Result } from './types';

const CORRECT = ['fb.correct0', 'fb.correct1', 'fb.correct2', 'fb.correct3'] as const;

/**
 * The result of an answer, shown in the page right under it (not as a sheet over it).
 * Right answers get a neon outline, wrong ones a tomato outline.
 */
export function FeedbackCard({ result, seed, heartLost }: { result: Result; seed: number; heartLost: boolean }) {
  const { t } = useT();
  const ok = result.correct;
  const title = result.title ?? (ok ? t(CORRECT[seed % CORRECT.length]) : t('fb.wrong'));
  const accent = ok ? C.neon : C.tomatoDeep;
  return (
    <View
      testID={ok ? 'feedback-correct' : 'feedback-wrong'}
      accessibilityLiveRegion="polite"
      style={[styles.card, { borderColor: ok ? C.neon : C.tomato }]}
    >
      <View style={[styles.mark, { backgroundColor: ok ? C.neon : C.tomato }]} />
      <View style={styles.text}>
        <Txt variant="h3" style={{ color: accent }} accessibilityRole="header">
          {title}
        </Txt>
        {!ok && result.answer && (
          <Txt variant="strong">
            {t('fb.answer')}: <Txt variant="strong" style={{ color: C.neon }}>{result.answer}</Txt>
          </Txt>
        )}
        {result.meaning && (
          <Txt variant="body" style={{ color: C.ink2 }}>
            {t('fb.meaning')}: {result.meaning}
          </Txt>
        )}
        {result.hint && (
          <Txt variant="small" style={{ color: C.ink2 }}>
            {result.hint}
          </Txt>
        )}
        {heartLost && (
          <View style={styles.spill}>
            <PotIcon size={18} off />
            <Txt variant="caption" style={{ color: C.tomatoDeep }}>
              {t('fb.heartLost')}
            </Txt>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: S.md, borderWidth: 2, borderRadius: R.lg, backgroundColor: C.card, padding: S.lg },
  mark: { width: 4, borderRadius: 2 },
  text: { flex: 1, gap: 4 },
  spill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
