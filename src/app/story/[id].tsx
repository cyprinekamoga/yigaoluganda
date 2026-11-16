import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { completeFeedback } from '@/audio/feedback';
import { CHAPTERS, STORIES, type Story } from '@/content';
import { useT } from '@/i18n';
import { fillName } from '@/logic/text';
import { isComplete } from '@/logic/unlock';
import { useApp, type Reward } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CowrieIcon } from '@/ui/Icons';
import { Ngaali } from '@/ui/Ngaali';
import { Screen } from '@/ui/Screen';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/**
 * A short reading story: the lines in Luganda, a translation for any line on tap (or all of them
 * with the switch), then a few questions to check it was understood.
 */
export default function StoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const done = useApp((s) => s.done);
  if (!id) return null;
  const story = STORIES.find((s) => s.id === id);
  const chapter = story ? CHAPTERS[story.after] : undefined;
  if (!story || !chapter || !isComplete(chapter, done)) return <Redirect href="/practice" />;
  return <StoryReader key={id} story={story} />;
}

function StoryReader({ story }: { story: Story }) {
  const { t, tr } = useT();
  const router = useRouter();
  const name = useApp((s) => s.profile?.name ?? '');
  const finishStory = useApp((s) => s.finishStory);
  const [showAll, setShowAll] = useState(false);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [reward, setReward] = useState<Reward | null>(null);

  const speaker = (who: string) => {
    const n = story.cast[who]?.name ?? who;
    return typeof n === 'string' ? fillName(n, name) : tr(n);
  };
  const allRight = story.questions.every((q, i) => picked[i] === q.answer);

  const finish = () => {
    completeFeedback();
    setReward(finishStory(story.id));
  };

  if (reward) {
    return (
      <Screen header={<BackBar title={story.lgTitle} />} testID="screen-story">
        <View style={styles.done} testID="story-done">
          <Ngaali mood="correct" size={110} />
          <Txt variant="hero" style={{ textAlign: 'center' }}>
            {t('story.doneTitle')}
          </Txt>
          <Txt variant="body" style={{ textAlign: 'center', color: C.ink2 }}>
            {t('story.doneBody')}
          </Txt>
          <View style={styles.pills}>
            <View style={styles.pill}>
              <CowrieIcon size={22} />
              <Txt style={styles.pillText}>{t('done.cowries', { n: reward.gems })}</Txt>
            </View>
            {reward.goalReached && (
              <View style={[styles.pill, { backgroundColor: C.neon }]}>
                <Txt style={[styles.pillText, { color: C.onNeon }]}>{t('goal.doneToday')}</Txt>
              </View>
            )}
          </View>
        </View>
        <Button testID="story-back" label={t('story.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/practice'))} />
      </Screen>
    );
  }

  return (
    <Screen header={<BackBar title={story.lgTitle} />} testID="screen-story">
      <View style={{ gap: 4 }}>
        <Txt variant="hero" accessibilityLanguage="lg">
          {story.lgTitle}
        </Txt>
        <Txt variant="body" style={{ color: C.ink2 }}>
          {tr(story.title)}
        </Txt>
      </View>
      <Card style={styles.setting}>
        <Txt variant="body" style={{ fontStyle: 'italic' }}>
          {fillName(tr(story.setting), name)}
        </Txt>
      </Card>

      <View style={styles.toggle}>
        <Txt variant="strong" style={{ flex: 1 }} nativeID="story-translate-label">
          {t('story.showAll')}
        </Txt>
        <Switch testID="story-translate" value={showAll} onValueChange={setShowAll} accessibilityLabelledBy="story-translate-label" trackColor={{ true: C.neon, false: C.line }} thumbColor={C.ink} />
      </View>
      <Txt variant="small">{t('story.tapHint')}</Txt>

      <View style={{ gap: S.sm }}>
        {story.lines.map((l, i) => {
          const mine = l.who === 'you';
          const open = showAll || shown[i];
          return (
            <Pressable
              key={i}
              testID={`story-line-${i}`}
              onPress={() => setShown((s) => ({ ...s, [i]: !s[i] }))}
              accessibilityRole="button"
              accessibilityHint={t('story.tapA11y')}
              style={[styles.line, mine ? styles.lineMine : styles.lineOther]}
            >
              <Txt variant="caption" style={[styles.who, mine && { color: C.neon }]}>
                {speaker(l.who)}
              </Txt>
              <Txt style={styles.lg} accessibilityLanguage="lg">
                {fillName(l.lg, name)}
              </Txt>
              {open && (
                <Txt variant="small" style={{ color: C.ink2 }} testID={`story-tr-${i}`}>
                  {fillName(tr(l.tr), name)}
                </Txt>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: S.md }}>
        <Txt variant="label">{t('story.questions')}</Txt>
        {story.questions.map((q, qi) => {
          const answer = picked[qi];
          return (
            <Card key={qi} style={{ gap: S.sm }} testID={`story-q-${qi}`}>
              <Txt variant="strong">{tr(q.q)}</Txt>
              {q.options.map((o, oi) => {
                const chosen = answer === oi;
                const right = chosen && oi === q.answer;
                const wrong = chosen && oi !== q.answer;
                return (
                  <Pressable
                    key={oi}
                    testID={process.env.EXPO_PUBLIC_E2E && oi === q.answer ? `story-q-${qi}-answer` : `story-q-${qi}-option`}
                    onPress={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                    disabled={answer === q.answer}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    style={[styles.option, right && styles.optionRight, wrong && styles.optionWrong]}
                  >
                    <Ionicons name={right ? 'checkmark-circle' : wrong ? 'close-circle' : 'ellipse-outline'} size={20} color={right ? C.neon : wrong ? C.tomatoDeep : C.ink3} />
                    <Txt variant="body" style={{ flex: 1 }}>
                      {tr(o)}
                    </Txt>
                  </Pressable>
                );
              })}
              {answer !== undefined && answer !== q.answer && (
                <Txt variant="small" style={{ color: C.tomatoDeep }}>
                  {t('story.tryAgain')}
                </Txt>
              )}
            </Card>
          );
        })}
      </View>

      <Button testID="story-finish" label={t('story.finish')} disabled={!allRight} onPress={finish} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  setting: { backgroundColor: C.paperDeep },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  line: { padding: S.md, borderRadius: R.lg, gap: 2, maxWidth: '88%' },
  lineOther: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  lineMine: { alignSelf: 'flex-end', backgroundColor: C.paperDeep, borderWidth: 1, borderColor: C.neon },
  who: { ...F.semi, color: C.tomatoDeep },
  lg: { ...F.semi, fontSize: 19, lineHeight: 26, color: C.ink },
  option: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 48, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  optionRight: { borderColor: C.neon },
  optionWrong: { borderColor: C.tomato },
  done: { alignItems: 'center', gap: S.md, paddingVertical: S.xl },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.paperDeep },
  pillText: { ...F.semi, fontSize: 15, color: C.ink },
});
