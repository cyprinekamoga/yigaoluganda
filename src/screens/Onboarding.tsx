import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Mascot } from '../components/Mascot'
import type { Lang } from '../content/types'
import { DEFAULT_MASCOT_NAME } from '../logic/progress'
import { useApp } from '../state/AppState'

/** Language (for everything, meanings included) → mascot name → start. */
export function Onboarding() {
  const { t, state, update } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(state.settings.mascotName || DEFAULT_MASCOT_NAME)

  const setUi = (uiLang: Lang) => {
    update((s) => ({ ...s, settings: { ...s.settings, uiLang, track: uiLang } }))
    setStep(2)
  }
  const finish = () => {
    const mascotName = name.trim().slice(0, 20) || DEFAULT_MASCOT_NAME
    update((s) => ({ ...s, settings: { ...s.settings, mascotName, onboarded: true } }))
    navigate('/', { replace: true })
  }

  const bubble = [t('onboarding.welcome'), t('onboarding.pickTrack'), t('onboarding.pickName')][step]

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-8">
      <div className="flex items-end gap-3">
        <Mascot mood={step === 2 ? 'cheer' : 'happy'} size={110} label={t('a11y.mascot', { mascot: name || DEFAULT_MASCOT_NAME })} />
        <p className="relative mb-10 flex-1 rounded-3xl border-2 border-line bg-cloud p-4 font-display text-xl font-medium">{bubble}</p>
      </div>
      <h1 className="mb-2 mt-6 font-display text-4xl font-bold text-lake">{t('app.name')}</h1>

      {step === 0 && (
        <section aria-labelledby="pick-ui" className="mt-4">
          <h2 id="pick-ui" className="mb-4 text-xl font-semibold">{t('onboarding.pickUi')}</h2>
          <div className="grid gap-3">
            <Button variant="ghost" block onClick={() => setUi('sv')} data-testid="ui-sv">
              <span aria-hidden="true">🇸🇪 </span>Svenska
            </Button>
            <Button variant="ghost" block onClick={() => setUi('en')} data-testid="ui-en">
              <span aria-hidden="true">🇬🇧 </span>English
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="pick-name" className="mt-4">
          <h2 id="pick-name" className="mb-2 text-xl font-semibold">{t('onboarding.pickName')}</h2>
          <p className="mb-4 text-ink-soft">{t('onboarding.nameHint')}</p>
          <label htmlFor="mascot-name" className="mb-1 block font-bold">
            {t('onboarding.nameLabel')}
          </label>
          <input
            id="mascot-name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            data-testid="mascot-name"
            className="mb-6 min-h-16 w-full rounded-2xl border-[3px] border-line bg-cloud px-4 text-2xl focus:border-lake focus:outline-none"
          />
          <Button variant="success" block onClick={finish} data-testid="start">
            {t('onboarding.ready', { mascot: name.trim() || DEFAULT_MASCOT_NAME })}
          </Button>
          <button type="button" className="mt-6 min-h-12 text-lg font-bold text-lake underline" onClick={() => setStep(0)}>
            {t('common.back')}
          </button>
        </section>
      )}
    </div>
  )
}
