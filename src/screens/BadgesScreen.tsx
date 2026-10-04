import { Layout } from '../components/Layout'
import { BADGES } from '../logic/badges'
import { useApp } from '../state/AppState'

export function BadgesScreen() {
  const { t, state } = useApp()
  const earned = BADGES.filter((b) => state.badges[b.id]).length
  return (
    <Layout title={t('badges.title')}>
      <h1 className="font-display text-3xl font-bold">{t('badges.title')}</h1>
      <p className="mb-5 text-lg text-ink-soft">{t('badges.earned', { n: earned, total: BADGES.length })}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGES.map((b) => {
          const has = Boolean(state.badges[b.id])
          return (
            <li key={b.id} className={`flex flex-col items-center rounded-3xl p-4 text-center ${has ? 'bg-cloud shadow-[0_5px_0_var(--color-sun)]' : 'border-2 border-dashed border-line'}`} data-testid={`badge-${b.id}`} data-earned={has}>
              <span aria-hidden="true" className={`text-5xl ${has ? '' : 'opacity-40 grayscale'}`}>
                {b.emoji}
              </span>
              <span className="mt-2 font-display text-lg font-semibold">{t(`badges.${b.id}.title`)}</span>
              <span className="text-sm text-ink-soft">{t(`badges.${b.id}.desc`)}</span>
              {!has && <span className="sr-only">{t('badges.locked')}</span>}
            </li>
          )
        })}
      </ul>
    </Layout>
  )
}
