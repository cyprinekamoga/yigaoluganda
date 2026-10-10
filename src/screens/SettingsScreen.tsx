import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import type { Lang } from '../content/types'
import { DEFAULT_MASCOT_NAME } from '../logic/progress'
import { logout, openSubscriptionPage } from '../platform/account'
import { useApp } from '../state/AppState'

function Segmented<T extends string>({ value, options, onChange, name }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-flow-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          data-testid={`${name}-${o.value}`}
          className={`min-h-14 rounded-2xl border-[3px] px-3 text-lg font-bold ${value === o.value ? 'border-lake bg-lake-soft text-lake-dark' : 'border-line bg-cloud'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsScreen() {
  const { t, state, update, cloudSaving, account } = useApp()
  const [portalError, setPortalError] = useState(false)
  const s = state.settings
  const [name, setName] = useState(s.mascotName)
  const set = (patch: Partial<typeof s>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }))
  const langs: { value: Lang; label: ReactNode }[] = [
    { value: 'sv', label: '🇸🇪 Svenska' },
    { value: 'en', label: '🇬🇧 English' },
  ]

  return (
    <Layout title={t('settings.title')}>
      <h1 className="mb-5 font-display text-3xl font-bold">{t('settings.title')}</h1>
      <p className="mb-5 rounded-2xl bg-cloud p-3 font-bold text-ink-soft" data-testid="cloud-status">
        {t(cloudSaving ? 'settings.cloudOn' : 'settings.cloudOff')}
      </p>
      <div className="grid gap-6">
        <section>
          <h2 className="mb-2 text-lg font-bold">{t('settings.uiLang')}</h2>
          <Segmented name="ui" value={s.uiLang} options={langs} onChange={(uiLang) => set({ uiLang })} />
        </section>
        <section>
          <h2 className="mb-2 text-lg font-bold">{t('settings.track')}</h2>
          <Segmented
            name="track"
            value={s.track}
            options={[
              { value: 'sv', label: t('onboarding.trackSv') },
              { value: 'en', label: t('onboarding.trackEn') },
            ]}
            onChange={(track) => set({ track })}
          />
        </section>
        <section>
          <label htmlFor="settings-name" className="mb-2 block text-lg font-bold">
            {t('settings.mascotName')}
          </label>
          <input
            id="settings-name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => set({ mascotName: name.trim() || DEFAULT_MASCOT_NAME })}
            className="min-h-14 w-full rounded-2xl border-[3px] border-line bg-cloud px-4 text-xl focus:border-lake focus:outline-none"
          />
        </section>
        <section>
          <h2 className="mb-2 text-lg font-bold">{t('settings.sound')}</h2>
          <Segmented
            name="sound"
            value={s.sound ? 'on' : 'off'}
            options={[
              { value: 'on', label: `🔔 ${t('settings.on')}` },
              { value: 'off', label: `🔕 ${t('settings.off')}` },
            ]}
            onChange={(v) => set({ sound: v === 'on' })}
          />
        </section>
        {account && (
          <section className="rounded-2xl bg-cloud p-4" data-testid="account">
            <h2 className="text-lg font-bold">{t('settings.account')}</h2>
            <p className="mb-3 break-all text-ink-soft">{t('settings.loggedInAs', { name: account.username })}</p>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => openSubscriptionPage().then((ok) => setPortalError(!ok))}
                className="btn-3d min-h-14 rounded-2xl border-2 border-line bg-cloud text-lg font-bold [--edge:var(--color-line)]"
              >
                💳 {t('settings.manageSubscription')}
              </button>
              {portalError && <p className="text-crane">{t('settings.portalError')}</p>}
              <button
                type="button"
                onClick={() => void logout()}
                className="btn-3d min-h-14 rounded-2xl border-2 border-line bg-cloud text-lg font-bold [--edge:var(--color-line)]"
              >
                🚪 {t('settings.logout')}
              </button>
            </div>
          </section>
        )}
        <Link to="/parent" className="btn-3d flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-cloud text-lg font-bold [--edge:var(--color-line)]" data-testid="parent-link">
          👪 {t('settings.parents')}
        </Link>
      </div>
    </Layout>
  )
}
