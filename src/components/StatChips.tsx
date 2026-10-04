import { visibleStreak, msUntilNextHeart, MAX_HEARTS } from '../logic/progress'
import { useApp } from '../state/AppState'

/** Streak, hearts and XP. Each has a text label for screen readers. */
export function StatChips() {
  const { state, hearts, now, t } = useApp()
  const streak = visibleStreak(state, new Date(now))
  const wait = Math.ceil(msUntilNextHeart(state, now) / 60_000)
  const heartTitle = hearts >= MAX_HEARTS ? t('stats.heartsFull') : t('stats.nextHeart', { min: wait })
  return (
    <div className="flex items-center gap-2 font-display text-lg font-semibold">
      <span className="flex items-center gap-1 rounded-full bg-cloud px-3 py-1" title={t('stats.streak', { n: streak })}>
        <span aria-hidden="true" className={streak ? '' : 'grayscale'}>🔥</span>
        <span className="sr-only">{t('stats.streak', { n: streak })}</span>
        <span aria-hidden="true">{streak}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full bg-cloud px-3 py-1" title={heartTitle} data-testid="hearts">
        <span aria-hidden="true">❤️</span>
        <span className="sr-only">{t('stats.hearts', { n: hearts })}</span>
        <span aria-hidden="true">{hearts}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full bg-cloud px-3 py-1" title={t('stats.xp', { n: state.xp })} data-testid="xp">
        <span aria-hidden="true">⭐</span>
        <span className="sr-only">{t('stats.xp', { n: state.xp })}</span>
        <span aria-hidden="true" data-testid="xp-value">{state.xp}</span>
      </span>
    </div>
  )
}
