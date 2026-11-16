import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ACCOUNTS } from '../account/config';
import { myFeedback, type FeedbackRow, type Rating } from '../account/feedback';
import { useT, type Key } from '../i18n';
import { useIsKid } from '../learners/store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { C, S } from '../ui/theme';
import { Txt } from '../ui/Txt';

export const RATING_KEY: Record<Rating, Key> = { good: 'fb.ratingGood', almost: 'fb.ratingAlmost', again: 'fb.ratingAgain' };
export const RATING_ICON: Record<Rating, 'checkmark-circle' | 'ellipse-outline' | 'refresh-circle'> = {
  good: 'checkmark-circle',
  almost: 'ellipse-outline',
  again: 'refresh-circle',
};

/** The learner's requests, fetched each time the screen comes into view. */
export function useMyFeedback(): FeedbackRow[] | null | 'error' {
  const [rows, setRows] = useState<FeedbackRow[] | null | 'error'>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      myFeedback().then((r) => live && setRows(r ?? 'error'));
      return () => {
        live = false;
      };
    }, []),
  );
  return rows;
}

/** On the Me tab: feedback from native speakers, with how many answers are new. */
export function NativeFeedbackCard() {
  const { t } = useT();
  const router = useRouter();
  const kid = useIsKid();
  const rows = useMyFeedback();
  if (!ACCOUNTS || kid) return null;
  const list = Array.isArray(rows) ? rows : [];
  const fresh = list.filter((r) => r.status === 'answered' && !r.seen_at).length;
  const waiting = list.filter((r) => r.status === 'open').length;
  const status = fresh ? (fresh === 1 ? t('fb.cardNewOne') : t('fb.cardNew', { n: fresh })) : waiting ? t('fb.cardWaiting', { n: waiting }) : null;
  return (
    <Card style={styles.card} testID="feedback-card">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="mic" size={20} color={C.onNeon} />
        </View>
        <Txt variant="h3" style={{ flex: 1 }}>
          {t('fb.title')}
        </Txt>
        {fresh > 0 && (
          <View style={styles.dot} testID="feedback-new">
            <Txt variant="caption" style={{ color: C.onTomato }}>
              {fresh}
            </Txt>
          </View>
        )}
      </View>
      <Txt variant="small" testID="feedback-status">
        {status ?? t('fb.cardBody')}
      </Txt>
      {list.length > 0 && <Button kind="secondary" testID="feedback-open" label={t('fb.open')} onPress={() => router.push('/feedback')} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.neon, alignItems: 'center', justifyContent: 'center' },
  dot: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: C.tomato, alignItems: 'center', justifyContent: 'center' },
});
