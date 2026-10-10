import { visibleStreak } from '../logic/progress'
import { useApp } from '../state/AppState'

/**
 * Sunny days in a row and ensimbi (cowrie shells, the old currency of Buganda) collected.
 * Each has a text label for screen readers.
 */
export function StatChips() {
  const { state, now, t } = useApp()
  const streak = visibleStreak(state, new Date(now))
  return (
    <div className="flex items-center gap-2 font-display text-lg font-semibold">
      <span className="flex items-center gap-1 rounded-full border-2 border-line bg-cloud px-3 py-1" title={t('stats.streak', { n: streak })} data-testid="streak">
        <span aria-hidden="true" className={streak ? '' : 'grayscale'}>☀️</span>
        <span className="sr-only">{t('stats.streak', { n: streak })}</span>
        <span aria-hidden="true">{streak}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full border-2 border-line bg-cloud px-3 py-1" title={t('stats.xp', { n: state.xp })} data-testid="xp">
        <span aria-hidden="true">🐚</span>
        <span className="sr-only">{t('stats.xp', { n: state.xp })}</span>
        <span aria-hidden="true" data-testid="xp-value">{state.xp}</span>
      </span>
    </div>
  )
}
