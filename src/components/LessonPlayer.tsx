import { useState } from 'react'
import { ExerciseView } from '../exercises/ExerciseView'
import type { ExerciseResult } from '../exercises/types'
import type { Exercise } from '../logic/generator'
import { loseHeart, recordAnswer } from '../logic/progress'
import { answer, current, isFinished, next, progress, startSession, type Session } from '../logic/session'
import { useApp } from '../state/AppState'
import { Button } from './Button'
import { FeedbackSheet } from './FeedbackSheet'
import { Mascot } from './Mascot'
import { ProgressBar } from './ProgressBar'
import { playCorrect, playGentle } from './sound'

export type PlayerMode = 'lesson' | 'practice' | 'story'

interface Props {
  exercises: Exercise[]
  mode: PlayerMode
  onFinish: (session: Session) => void
  onExit: () => void
  onOutOfHearts: () => void
}

/** Runs a list of exercises: check, feedback, continue. Lessons cost hearts; practice and stories don't. */
export function LessonPlayer({ exercises, mode, onFinish, onExit, onOutOfHearts }: Props) {
  const { t, track, update, state, hearts } = useApp()
  const [session, setSession] = useState(() => startSession(exercises))
  const [pending, setPending] = useState<ExerciseResult | null>(null)
  const [result, setResult] = useState<ExerciseResult | null>(null)
  const [quitting, setQuitting] = useState(false)
  const [heartsLeft, setHeartsLeft] = useState(hearts)

  const exercise = current(session)
  if (!exercise) return null

  const commit = (r: ExerciseResult) => {
    setResult(r)
    const loses = mode === 'lesson' && !r.correct
    update((s, now) => {
      let out = s
      const perWord = r.wordResults ?? Object.fromEntries(exercise.wordIds.map((id) => [id, r.correct]))
      for (const [id, ok] of Object.entries(perWord)) out = recordAnswer(out, [id], ok, now)
      if (loses) out = loseHeart(out, now)
      return out
    })
    if (loses) setHeartsLeft((h) => Math.max(0, h - 1))
    if (state.settings.sound) (r.correct ? playCorrect : playGentle)()
  }

  const proceed = () => {
    if (!result) return
    const nextSession = next(answer(session, result.correct))
    setResult(null)
    setPending(null)
    if (mode === 'lesson' && heartsLeft <= 0) return onOutOfHearts()
    if (isFinished(nextSession)) return onFinish(nextSession)
    setSession(nextSession)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-40 pt-4">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQuitting(true)}
          aria-label={t('a11y.close')}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-3xl text-stone hover:bg-cloud"
        >
          <span aria-hidden="true">✕</span>
        </button>
        <ProgressBar value={progress(session)} label={t('a11y.progress')} />
        {mode === 'lesson' && (
          <span className="flex items-center gap-1 font-display text-xl font-semibold text-crane" data-testid="lesson-hearts">
            <span aria-hidden="true">❤️</span>
            <span className="sr-only">{t('stats.hearts', { n: heartsLeft })}</span>
            <span aria-hidden="true">{heartsLeft}</span>
          </span>
        )}
      </header>

      <main key={exercise.id} className="flex-1" data-testid="exercise" data-kind={exercise.kind}>
        <ExerciseView exercise={exercise} lang={track} checked={result !== null} setPending={setPending} submit={commit} />
      </main>

      {!result && exercise.kind !== 'pairs' && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-mist/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="mx-auto max-w-xl px-4">
            <Button block variant="success" disabled={!pending} onClick={() => pending && commit(pending)} data-testid="check">
              {t('common.check')}
            </Button>
          </div>
        </div>
      )}

      {result && <FeedbackSheet result={result} onContinue={proceed} />}

      {quitting && (
        <div role="dialog" aria-modal="true" aria-labelledby="quit-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-cloud p-6 text-center">
            <Mascot mood="think" size={80} className="mx-auto" />
            <h2 id="quit-title" className="mt-2 font-display text-2xl font-semibold">{t('lesson.quitTitle')}</h2>
            <p className="mb-5 mt-1 text-ink-soft">{t('lesson.quitBody')}</p>
            <div className="grid gap-3">
              <Button block autoFocus onClick={() => setQuitting(false)}>
                {t('lesson.quitNo')}
              </Button>
              <Button block variant="ghost" onClick={onExit}>
                {t('lesson.quitYes')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type { Session }
