import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { CLIPS } from './clips';

/**
 * Native-speaker clips. Clips are bundled (assets/audio) so Unit 1 works offline.
 * Players are created ahead of time (preloadClips) so a tap plays without delay.
 * Slow "turtle" playback is 0.75× with pitch correction, so no separate slow files are needed.
 */

export const SLOW_RATE = 0.75;

export function hasAudio(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIPS, id);
}

export function audioCount(): number {
  return Object.keys(CLIPS).length;
}

const cache = new Map<string, AudioPlayer>();

function playerFor(id: string): AudioPlayer {
  let p = cache.get(id);
  if (!p) {
    p = createAudioPlayer(CLIPS[id]);
    cache.set(id, p);
  }
  return p;
}

let modeReady: Promise<void> | null = null;
export function initAudio(): Promise<void> {
  modeReady ??= setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  return modeReady;
}

/** Load the clips a lesson will need before it starts. */
export function preloadClips(ids: string[]) {
  for (const id of ids) if (hasAudio(id)) playerFor(id);
}

export async function playClip(id: string, slow = false): Promise<void> {
  if (!hasAudio(id)) return;
  await initAudio();
  const p = playerFor(id);
  try {
    p.shouldCorrectPitch = true;
    p.setPlaybackRate(slow ? SLOW_RATE : 1, 'high');
    await p.seekTo(0);
    p.play();
  } catch {
    // A failed clip should never break a lesson.
  }
}

/** Free players when a lesson ends. */
export function releaseClips() {
  for (const p of cache.values()) {
    try {
      p.remove();
    } catch {
      /* already released */
    }
  }
  cache.clear();
}
