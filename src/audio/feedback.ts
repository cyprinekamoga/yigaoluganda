import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { useApp } from '../state/store';

/** Sound effects and haptics, respecting the learner's settings. */

const SFX = {
  correct: require('../../assets/sfx/correct.wav'),
  wrong: require('../../assets/sfx/wrong.wav'),
  match: require('../../assets/sfx/match.wav'),
  complete: require('../../assets/sfx/complete.wav'),
} as const;

export type Sfx = keyof typeof SFX;
const players: Partial<Record<Sfx, AudioPlayer>> = {};

export function sfx(name: Sfx) {
  if (!useApp.getState().settings.sfx) return;
  try {
    const p = (players[name] ??= createAudioPlayer(SFX[name]));
    p.seekTo(0).catch(() => undefined);
    p.play();
  } catch {
    /* sound is a nice-to-have */
  }
}

function haptic(kind: 'tap' | 'success' | 'error') {
  if (Platform.OS === 'web' || !useApp.getState().settings.haptics) return;
  try {
    if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  } catch {
    /* not supported */
  }
}

export const tapFeedback = () => haptic('tap');
export const correctFeedback = () => {
  sfx('correct');
  haptic('success');
};
export const wrongFeedback = () => {
  sfx('wrong');
  haptic('error');
};
export const matchFeedback = () => {
  sfx('match');
  haptic('tap');
};
export const completeFeedback = () => {
  sfx('complete');
  haptic('success');
};
