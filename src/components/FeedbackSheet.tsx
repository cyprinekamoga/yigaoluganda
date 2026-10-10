import { useEffect, useMemo, useRef } from 'react'
import type { ExerciseResult } from '../exercises/types'
import { useApp } from '../state/AppState'
import { Button } from './Button'
import { Lg } from './Lg'
import { Mascot } from './Mascot'

/** Shown after "Check". Right: a cheer. Not right: a calm correction that shows the answer. */
export function FeedbackSheet({ result, onContinue }: { result: ExerciseResult; onContinue: () => void }) {
  const { t, tList } = useApp()
  const praise = useMemo(() => {
    const list = tList('feedback.correct')
    return list[Math.floor(Math.random() * list.length)] ?? ''
  }, [tList])
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => button.current?.focus(), [])

  const ok = result.correct
  return (
    <div
      role="status"
      aria-live="assertive"
      data-testid={ok ? 'feedback-correct' : 'feedback-wrong'}
      className={`animate-rise fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl rounded-[28px] border-[3px] pb-4 pt-4 shadow-[0_18px_40px_-16px_rgba(43,29,20,0.45)] ${ok ? 'border-leaf bg-leaf-soft' : 'border-sun bg-sun-soft'}`}
    >
      <div className="flex items-end gap-3 px-4">
        <Mascot mood={ok ? 'cheer' : 'gentle'} size={64} />
        <div className="min-w-0 flex-1 pb-1">
          {ok ? (
            <p className="font-display text-3xl font-semibold text-leaf-dark">{praise}</p>
          ) : (
            <>
              <p className="font-display text-xl font-semibold text-ink">{t(result.nearMissDoubles ? 'feedback.nearDoubles' : 'feedback.almost')}</p>
              {result.solution && (
                <p className="text-2xl font-bold text-ink" data-testid="solution">
                  {result.solutionIsLuganda ? <Lg>{result.solution}</Lg> : result.solution}
                </p>
              )}
            </>
          )}
          {result.meaning && (
            <p className="text-lg text-ink-soft">
              {t('feedback.meaning')} {result.meaning}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 px-4">
        <Button ref={button} variant={ok ? 'success' : 'sun'} block onClick={onContinue} data-testid="continue">
          {t('common.continue')}
        </Button>
      </div>
    </div>
  )
}
