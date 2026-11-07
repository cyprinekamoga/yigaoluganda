import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { hasAudio, playClip } from '../../audio/engine';
import { PHRASES } from '../../content';
import { useT } from '../../i18n';
import { useApp } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { C, F, R, S } from '../../ui/theme';
import { Txt } from '../../ui/Txt';
import { Footer } from '../Footer';
import { SpeakerButtons } from '../SpeakerButtons';
import type { ExerciseProps } from '../types';

type Phase = 'idle' | 'recording' | 'recorded' | 'denied' | 'error';

/**
 * Speak & compare. The learner records themselves and plays their voice back next to
 * the native recording, then judges how close it was. There is no automatic scoring:
 * no reliable Luganda pronunciation model exists to run on-device, and saying so is better than faking it.
 */
export function SpeakStep({ step, onNext }: ExerciseProps<{ kind: 'speak'; phraseId: string }>) {
  const { t, tr } = useT();
  const p = PHRASES[step.phraseId];
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const noteRecording = useApp((s) => s.noteRecording);
  const [phase, setPhase] = useState<Phase>('idle');
  const mine = useRef<AudioPlayer | null>(null);
  const native = hasAudio(p.id);

  useEffect(
    () => () => {
      mine.current?.remove();
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    },
    [],
  );

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return setPhase('denied');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch {
      setPhase('error');
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
    } catch {
      /* handled below */
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    const uri = recorder.uri;
    if (!uri) return setPhase('error');
    mine.current?.remove();
    mine.current = createAudioPlayer({ uri });
    setPhase('recorded');
    noteRecording();
  };

  const playMine = async () => {
    const pl = mine.current;
    if (!pl) return;
    await pl.seekTo(0).catch(() => undefined);
    pl.play();
  };

  const recording = phase === 'recording';
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="h2" accessibilityRole="header">
          {t('lesson.speak')}
        </Txt>
        <Card style={styles.card}>
          <Txt variant="lgBig">{p.lg}</Txt>
          <Txt variant="body" style={{ color: C.ink2 }}>
            {tr(p.tr)}
          </Txt>
          {native ? <SpeakerButtons id={p.id} /> : <Txt variant="small">{t('speak.noNative')}</Txt>}
        </Card>

        {phase === 'denied' && <Txt variant="body" style={styles.warn}>{t('speak.denied')}</Txt>}
        {phase === 'error' && <Txt variant="body" style={styles.warn}>{t('speak.unavailable')}</Txt>}

        <View style={styles.micWrap}>
          <Pressable
            testID="mic"
            onPress={recording ? stop : start}
            accessibilityRole="button"
            accessibilityLabel={recording ? t('speak.recording') : phase === 'recorded' ? t('speak.again') : t('speak.record')}
            style={({ pressed }) => [styles.mic, recording && styles.micOn, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <Ionicons name={recording ? 'stop' : 'mic'} size={40} color={recording ? C.onNeon : C.onTomato} />
          </Pressable>
          <Txt variant="strong">{recording ? t('speak.recording') : phase === 'recorded' ? t('speak.again') : t('speak.record')}</Txt>
        </View>

        {phase === 'recorded' && (
          <View style={styles.compare}>
            <Txt variant="body">{native ? t('speak.compare') : t('speak.listenBack')}</Txt>
            <View style={styles.compareRow}>
              <Pressable onPress={playMine} accessibilityRole="button" accessibilityLabel={`${t('lesson.play')}: ${t('speak.yours')}`} style={styles.playBtn}>
                <Ionicons name="play" size={18} color={C.ink} />
                <Txt style={styles.playText}>{t('speak.yours')}</Txt>
              </Pressable>
              {native && (
                <Pressable onPress={() => playClip(p.id)} accessibilityRole="button" accessibilityLabel={`${t('lesson.play')}: ${t('speak.native')}`} style={styles.playBtn}>
                  <Ionicons name="play" size={18} color={C.ink} />
                  <Txt style={styles.playText}>{t('speak.native')}</Txt>
                </Pressable>
              )}
            </View>
            <Txt variant="small">{t('speak.selfCheck')}</Txt>
          </View>
        )}
      </ScrollView>
      <Footer>
        {phase === 'recorded' ? (
          <View style={styles.rate}>
            <Button style={{ flex: 1 }} kind="secondary" label={t('speak.practise')} onPress={onNext} />
            <Button style={{ flex: 1 }} kind="success" label={t('speak.close')} onPress={onNext} />
          </View>
        ) : (
          <Button testID="speak-skip" kind="ghost" label={t('common.skip')} onPress={onNext} />
        )}
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { gap: S.md, padding: S.xl },
  warn: { color: C.redDeep, backgroundColor: C.redSoft, padding: S.md, borderRadius: R.md },
  micWrap: { alignItems: 'center', gap: S.sm },
  mic: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.tomato, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: C.neon },
  compare: { gap: S.md },
  compareRow: { flexDirection: 'row', gap: S.md },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 48, borderRadius: R.pill, backgroundColor: C.tomatoSoft },
  playText: { ...F.semi, fontSize: 15, color: C.ink },
  rate: { flexDirection: 'row', gap: S.md },
});
