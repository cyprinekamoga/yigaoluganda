import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Ngaali } from '../ui/Ngaali';
import { C, MAX_W, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import type { Result } from './types';

const CORRECT = ['fb.correct0', 'fb.correct1', 'fb.correct2', 'fb.correct3'] as const;

export function FeedbackPanel({ result, seed, onContinue, heartLost }: { result: Result; seed: number; onContinue: () => void; heartLost: boolean }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const ok = result.correct;
  const title = result.title ?? (ok ? t(CORRECT[seed % CORRECT.length]) : t('fb.wrong'));
  return (
    <View
      testID={ok ? 'feedback-correct' : 'feedback-wrong'}
      accessibilityLiveRegion="polite"
      style={[styles.panel, { backgroundColor: ok ? C.leafSoft : C.redSoft, borderTopColor: ok ? C.leaf : C.red, paddingBottom: S.lg + insets.bottom }]}
    >
      <View style={styles.inner}>
        <View style={styles.row}>
          <Ngaali mood={ok ? 'correct' : 'incorrect'} size={64} />
          <View style={styles.text}>
            <Txt variant="h2" style={{ color: ok ? C.leafDeep : C.redDeep }} accessibilityRole="header">
              {title}
            </Txt>
            {!ok && result.answer && (
              <Txt variant="strong" style={{ color: C.redDeep }}>
                {t('fb.answer')}: {result.answer}
              </Txt>
            )}
            {result.meaning && (
              <Txt variant="body" style={{ color: ok ? C.leafDeep : C.redDeep }}>
                {t('fb.meaning')}: {result.meaning}
              </Txt>
            )}
            {result.hint && (
              <Txt variant="small" style={{ color: ok ? C.leafDeep : C.redDeep }}>
                {result.hint}
              </Txt>
            )}
            {heartLost && (
              <Txt variant="caption" style={{ color: C.redDeep }}>
                {t('fb.heartLost')}
              </Txt>
            )}
          </View>
        </View>
        <Button testID="feedback-continue" kind={ok ? 'success' : 'danger'} label={t('common.continue')} onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 3, paddingTop: S.lg },
  inner: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.lg, gap: S.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  text: { flex: 1, gap: 2 },
});
