import { useEffect } from 'react'
import { BADGES } from '../logic/badges'
import { useApp } from '../state/AppState'
import { Button } from './Button'
import { Confetti } from './Confetti'
import { Mascot } from './Mascot'
import { playFanfare } from './sound'

interface Props {
  title: string
  xp: number
  mistakes: number
  badges: string[]
  extra?: string
  onContinue: () => void
}

/** Celebration after a lesson, practice round or story chapter. */
export function CompleteScreen({ title, xp, mistakes, badges, extra, onContinue }: Props) {
  const { t, state } = useApp()
  useEffect(() => {
    if (state.settings.sound) playFanfare()
  }, [state.settings.sound])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center px-4 py-10 text-center" data-testid="complete">
      <Confetti />
      <Mascot mood="cheer" size={140} label={t('a11y.mascot', { mascot: state.settings.mascotName })} />
      <h1 className="mt-4 font-display text-4xl font-bold text-lake-dark">{title}</h1>
      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        <div className="rounded-3xl border-4 border-sun bg-sun-soft p-4">
          <p className="font-display text-3xl font-bold" data-testid="xp-earned">
            {t('lesson.xpEarned', { n: xp })}
          </p>
        </div>
        <div className="rounded-3xl border-4 border-leaf bg-leaf-soft p-4">
          <p className="font-display text-xl font-semibold text-leaf-dark">{mistakes === 0 ? t('lesson.perfect') : t('lesson.mistakes', { n: mistakes })}</p>
        </div>
      </div>
      {extra && <p className="mt-4 rounded-2xl bg-cloud p-3 text-lg font-semibold">{extra}</p>}
      {badges.length > 0 && (
        <div className="mt-6 w-full rounded-3xl bg-cloud p-4" role="status">
          <p className="font-display text-xl font-semibold">{t('lesson.newBadge')}</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-4">
            {badges.map((id) => (
              <li key={id} className="flex flex-col items-center">
                <span className="text-5xl" aria-hidden="true">
                  {BADGES.find((b) => b.id === id)?.emoji}
                </span>
                <span className="font-bold">{t(`badges.${id}.title`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto w-full pt-8">
        <Button block variant="success" onClick={onContinue} autoFocus data-testid="finish">
          {t('common.continue')}
        </Button>
      </div>
    </div>
  )
}
