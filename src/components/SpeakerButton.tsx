import { useRef } from 'react'
import { audioUrl, hasAudio } from '../content'
import { useApp } from '../state/AppState'

/** Plays a native-speaker recording. Renders nothing when there is no recording for the word. */
export function SpeakerButton({ wordId, size = 'md', autoFocus }: { wordId: string; size?: 'md' | 'lg'; autoFocus?: boolean }) {
  const { t } = useApp()
  const audio = useRef<HTMLAudioElement | null>(null)
  if (!hasAudio(wordId)) return null
  const play = () => {
    audio.current ??= new Audio(audioUrl(wordId))
    audio.current.currentTime = 0
    void audio.current.play().catch(() => undefined)
  }
  const dim = size === 'lg' ? 'h-24 w-24 text-5xl' : 'h-12 w-12 text-2xl'
  return (
    <button
      type="button"
      onClick={play}
      autoFocus={autoFocus}
      aria-label={t('exercise.playAudio')}
      className={`btn-3d grid shrink-0 place-items-center rounded-2xl bg-lake text-white [--edge:var(--color-lake-dark)] ${dim}`}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  )
}
