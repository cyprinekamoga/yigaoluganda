import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { correctFeedback, wrongFeedback } from '../../audio/feedback';
import { DIALOGUES } from '../../content';
import { useT } from '../../i18n';
import { fillName } from '../../logic/text';
import { Button } from '../../ui/Button';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Avatar } from '../Avatar';
import { Footer } from '../Footer';
import type { ExerciseProps } from '../types';

const REVEAL_MS = 650;

/**
 * Contextual dialogue & roleplay: a chat where the learner picks the reply that fits the situation.
 * A wrong reply costs a heart (in lessons), shows why it doesn't fit, and can be retried.
 */
export function DialogueStep({ step, locked, name, onMistake, onNext }: ExerciseProps<{ kind: 'dialogue'; dialogueId: string }>) {
  const { t, tr } = useT();
  const d = DIALOGUES[step.dialogueId];
  const [shown, setShown] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [wrong, setWrong] = useState<Record<number, number[]>>({});
  const [why, setWhy] = useState<string | null>(null);
  const [meanings, setMeanings] = useState(true);
  const scroller = useRef<ScrollViewInstance>(null);

  const current = shown < d.lines.length ? d.lines[shown] : null;
  const waitingForChoice = current?.kind === 'choose' && answers[shown] === undefined;
  const finished = shown >= d.lines.length;

  // Reveal narration and the other speakers' lines one at a time, stopping at each choice.
  useEffect(() => {
    if (finished || waitingForChoice) return;
    const id = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 250 : REVEAL_MS);
    return () => clearTimeout(id);
  }, [shown, finished, waitingForChoice]);

  const choose = (lineIdx: number, optIdx: number) => {
    const line = d.lines[lineIdx];
    if (line.kind !== 'choose' || locked) return;
    const opt = line.options[optIdx];
    if (opt.correct) {
      correctFeedback();
      setWhy(null);
      setAnswers((a) => ({ ...a, [lineIdx]: optIdx }));
      setShown(lineIdx + 1);
    } else {
      wrongFeedback();
      onMistake();
      setWrong((w) => ({ ...w, [lineIdx]: [...(w[lineIdx] ?? []), optIdx] }));
      setWhy(opt.why ? tr(opt.why) : null);
    }
  };

  return (
    <View style={styles.fill}>
      <ScrollView ref={scroller} contentContainerStyle={styles.body} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
        <View style={styles.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label">{t('lesson.dialogue')}</Txt>
            <Txt variant="h2" accessibilityRole="header">
              {tr(d.title)}
            </Txt>
            <Txt variant="small">{tr(d.setting)}</Txt>
          </View>
          <Pressable
            onPress={() => setMeanings((m) => !m)}
            accessibilityRole="switch"
            accessibilityState={{ checked: meanings }}
            accessibilityLabel={meanings ? t('lesson.hideMeanings') : t('lesson.showMeanings')}
            style={styles.toggle}
          >
            <Ionicons name={meanings ? 'eye' : 'eye-off'} size={18} color={C.ink} />
          </Pressable>
        </View>

        {d.lines.slice(0, shown).map((line, i) => {
          if (line.kind === 'narrate') {
            return (
              <View key={i} style={styles.narrate}>
                <Txt variant="small" style={styles.narrateText}>
                  {fillName(tr(line.text), name)}
                </Txt>
              </View>
            );
          }
          if (line.kind === 'say') {
            const who = d.cast[line.who];
            return (
              <View key={i} style={styles.theirRow}>
                <Avatar role={who.role} name={who.name} />
                <View style={[styles.bubble, styles.theirs]}>
                  <Txt variant="caption">{who.name}</Txt>
                  <Txt style={styles.lg}>{fillName(line.lg, name)}</Txt>
                  {meanings && <Txt variant="small">{fillName(tr(line.tr), name)}</Txt>}
                </View>
              </View>
            );
          }
          const a = answers[i];
          if (a === undefined) return null;
          const opt = line.options[a];
          return (
            <View key={i} style={styles.mineRow}>
              <View style={[styles.bubble, styles.mine]}>
                <Txt variant="caption" style={{ color: C.sun }}>
                  {t('lesson.you')}
                </Txt>
                <Txt style={[styles.lg, { color: C.onInk }]}>{fillName(opt.lg, name)}</Txt>
                {meanings && <Txt style={styles.mineTr}>{fillName(tr(opt.tr), name)}</Txt>}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {waitingForChoice && current?.kind === 'choose' && (
        <Footer>
          <Txt variant="label">{t('lesson.yourTurn')}</Txt>
          <Txt variant="strong" testID="dialogue-prompt">
            {fillName(tr(current.prompt), name)}
          </Txt>
          {why && (
            <View style={styles.why} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={C.redDeep} />
              <Txt variant="small" style={{ color: C.redDeep, flex: 1 }}>
                {why}
              </Txt>
            </View>
          )}
          {current.options.map((o, oi) => {
            const isWrong = (wrong[shown] ?? []).includes(oi);
            return (
              <Pressable
                key={oi}
                testID={process.env.EXPO_PUBLIC_E2E && o.correct ? 'dialogue-answer' : 'dialogue-option'}
                disabled={isWrong || locked}
                onPress={() => choose(shown, oi)}
                accessibilityRole="button"
                accessibilityState={{ disabled: isWrong }}
                style={({ pressed }) => [styles.option, isWrong && styles.optionWrong, pressed && { transform: [{ scale: 0.98 }] }]}
              >
                <Txt style={[styles.optionText, isWrong && { color: C.redDeep, textDecorationLine: 'line-through' }]}>{fillName(o.lg, name)}</Txt>
              </Pressable>
            );
          })}
        </Footer>
      )}
      {finished && (
        <Footer>
          <Button testID="continue" kind="success" label={t('common.continue')} onPress={onNext} />
        </Footer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.md, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: S.xl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginBottom: S.sm },
  toggle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  narrate: { alignSelf: 'center', backgroundColor: C.paperDeep, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, maxWidth: '92%' },
  narrateText: { fontStyle: 'italic', textAlign: 'center' },
  theirRow: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, maxWidth: '88%' },
  mineRow: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.lg, gap: 2, flexShrink: 1 },
  theirs: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 6 },
  mine: { backgroundColor: C.ink, borderBottomRightRadius: 6, maxWidth: '85%' },
  lg: { ...F.semi, fontSize: 18, lineHeight: 24, color: C.ink },
  mineTr: { ...F.body, fontSize: 14, lineHeight: 20, color: '#E9DEC9' },
  why: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start', backgroundColor: C.redSoft, padding: S.md, borderRadius: R.md },
  option: { minHeight: 52, borderRadius: R.md, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: S.lg, paddingVertical: 10, justifyContent: 'center' },
  optionWrong: { borderColor: C.redSoft, backgroundColor: C.redSoft },
  optionText: { ...F.semi, fontSize: 17, color: C.ink },
});
