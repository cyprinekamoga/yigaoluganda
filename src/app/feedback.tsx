import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { FormMessage } from '@/account/AuthShell';
import { markFeedbackSeen } from '@/account/feedback';
import { PHRASES } from '@/content';
import { RATING_ICON, RATING_KEY, useMyFeedback } from '@/feedback/Inbox';
import { useT } from '@/i18n';
import { useIsKid } from '@/learners/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { C, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/** "Feedback from native speakers": the learner's recordings and what the reviewers said. */
export default function FeedbackInbox() {
  const { t, tr, lang } = useT();
  const router = useRouter();
  const kid = useIsKid();
  const rows = useMyFeedback();
  const unseen = Array.isArray(rows) && rows.some((r) => r.status === 'answered' && !r.seen_at);

  // Opening the list marks new answers as read (the "new" marks still show this time).
  useEffect(() => {
    if (unseen) markFeedbackSeen();
  }, [unseen]);

  if (kid) return <Redirect href="/" />;
  const day = (iso: string) => new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <Screen header={<BackBar title={t('fb.title')} />} testID="screen-feedback">
      {rows === 'error' && <FormMessage text={t('auth.errNetwork')} />}
      {Array.isArray(rows) && rows.length === 0 && <Txt variant="body">{t('fb.empty')}</Txt>}
      {Array.isArray(rows) &&
        rows.map((r) => {
          const p = PHRASES[r.phrase_id];
          const isNew = r.status === 'answered' && !r.seen_at;
          return (
            <Card key={r.id} style={[styles.row, isNew && styles.rowNew]} testID={`feedback-${r.phrase_id}`}>
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Txt variant="strong" style={{ color: C.neon }}>
                    {p?.lg ?? r.phrase_id}
                  </Txt>
                  {p && <Txt variant="small">{tr(p.tr)}</Txt>}
                </View>
                {isNew && (
                  <Txt variant="caption" style={styles.newTag}>
                    {t('common.new')}
                  </Txt>
                )}
              </View>
              {r.status === 'answered' && r.rating ? (
                <View style={{ gap: S.xs }}>
                  <View style={styles.rating}>
                    <Ionicons name={RATING_ICON[r.rating]} size={20} color={r.rating === 'again' ? C.tomatoDeep : C.neon} />
                    <Txt variant="strong" testID="feedback-rating">
                      {t(RATING_KEY[r.rating])}
                    </Txt>
                  </View>
                  {r.tip ? (
                    <Txt variant="body" testID="feedback-tip">
                      “{r.tip}”
                    </Txt>
                  ) : null}
                </View>
              ) : (
                <Txt variant="small" style={{ color: C.ink3 }}>
                  {r.status === 'open' ? t('fb.waiting') : t('fb.expired')}
                </Txt>
              )}
              <View style={styles.bottom}>
                <Txt variant="caption" style={{ color: C.ink3 }}>
                  {t('fb.sent', { date: day(r.created_at) })}
                </Txt>
                {p && r.status !== 'open' && <Button small kind="ghost" label={t('fb.practise')} onPress={() => router.push(`/practice/speak?id=${p.id}`)} />}
              </View>
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: S.sm },
  rowNew: { borderColor: C.neon },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
  newTag: { color: C.onNeon, backgroundColor: C.neon, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
