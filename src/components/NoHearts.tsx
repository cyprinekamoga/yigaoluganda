import { useNavigate } from 'react-router-dom'
import { msUntilNextHeart } from '../logic/progress'
import { useApp } from '../state/AppState'
import { Button } from './Button'
import { Mascot } from './Mascot'

/** Never a dead end: practice is always available and refills all hearts. */
export function NoHearts() {
  const { t, state, now } = useApp()
  const navigate = useNavigate()
  const minutes = Math.ceil(msUntilNextHeart(state, now) / 60_000)
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center px-4 py-10 text-center" data-testid="no-hearts">
      <Mascot mood="sleep" size={130} />
      <h1 className="mt-4 font-display text-3xl font-bold">{t('lesson.noHeartsTitle')}</h1>
      <p className="mt-2 text-lg">{t('lesson.noHeartsBody')}</p>
      <p className="mt-2 text-ink-soft">{t('stats.nextHeart', { min: minutes })}</p>
      <div className="mt-auto grid w-full gap-3 pt-8">
        <Button block variant="success" onClick={() => navigate('/practice?start=1', { replace: true })} data-testid="go-practice">
          {t('lesson.goPractice')}
        </Button>
        <Button block variant="ghost" onClick={() => navigate('/', { replace: true })}>
          {t('common.back')}
        </Button>
      </div>
    </div>
  )
}
