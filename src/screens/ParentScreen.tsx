import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Lg } from '../components/Lg'
import { getWord, hasWord, story, units } from '../content'
import { visibleStreak } from '../logic/progress'
import { countLearned, strength } from '../logic/srs'
import { useApp } from '../state/AppState'

/** A simple grown-up check: multiplication most 6–12 year olds can't do at a glance. */
function ParentGate({ onPass }: { onPass: () => void }) {
  const { t } = useApp()
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 4), 7 + Math.floor(Math.random() * 3)], [])
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  const check = () => (Number(value) === a * b ? onPass() : (setWrong(true), setValue('')))
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t('parent.gateTitle')}</h1>
      <p className="mb-4 text-lg">{t('parent.gateBody')}</p>
      <form onSubmit={(e) => (e.preventDefault(), check())}>
        <label htmlFor="gate" className="mb-2 block text-2xl font-bold" data-testid="gate-question" data-a={a} data-b={b}>
          {t('parent.gateQuestion', { a, b })}
        </label>
        <input
          id="gate"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          aria-invalid={wrong}
          data-testid="gate-input"
          className="mb-3 min-h-16 w-full rounded-2xl border-[3px] border-line bg-cloud px-4 text-2xl focus:border-lake focus:outline-none"
        />
        {wrong && <p className="mb-3 font-bold text-crane" role="alert">{t('parent.gateWrong')}</p>}
        <Button type="submit" block data-testid="gate-submit">
          {t('common.continue')}
        </Button>
      </form>
    </div>
  )
}

export function ParentScreen() {
  const { t, state, reset, now, track } = useApp()
  const navigate = useNavigate()
  const [passed, setPassed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [erased, setErased] = useState(false)

  if (!passed) return <ParentGate onPass={() => setPassed(true)} />

  const weak = Object.entries(state.memory)
    .filter(([id, m]) => m.wrong > 0 && hasWord(id))
    .sort((x, y) => strength(x[1]) - strength(y[1]))
    .slice(0, 10)

  const stats = [
    [t('parent.lessonsDone'), Object.keys(state.completedLessons).length],
    [t('parent.storiesDone'), `${Object.keys(state.completedStories).length} / ${story.chapters.length}`],
    [t('parent.wordsLearned'), countLearned(state.memory)],
    [t('parent.xp'), state.xp],
    [t('parent.streak'), t('parent.days', { n: visibleStreak(state, new Date(now)) })],
    [t('parent.bestStreak'), t('parent.days', { n: state.bestStreak })],
  ] as const

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-6" data-testid="parent-page">
      <button type="button" onClick={() => navigate('/settings')} className="mb-3 min-h-12 font-bold text-lake underline">
        ← {t('common.back')}
      </button>
      <h1 className="font-display text-3xl font-bold">{t('parent.title')}</h1>

      <section className="mt-5">
        <h2 className="mb-2 font-display text-xl font-semibold">{t('parent.progress')}</h2>
        <dl className="grid grid-cols-2 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-cloud p-3">
              <dt className="text-sm font-bold text-ink-soft">{label}</dt>
              <dd className="font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-display text-xl font-semibold">{t('parent.unitProgress')}</h2>
        <ul className="grid gap-2">
          {units.map((u) => {
            const done = u.lessons.filter((l) => state.completedLessons[l.id]).length
            return (
              <li key={u.id} className="rounded-2xl bg-cloud p-3">
                <div className="flex justify-between gap-2 font-bold">
                  <span>
                    {u.emoji} {u.title[track]}
                  </span>
                  <span>
                    {done}/{u.lessons.length}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-line" aria-hidden="true">
                  <div className="h-2 rounded-full bg-leaf" style={{ width: `${(done / u.lessons.length) * 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-display text-xl font-semibold">{t('parent.weakWords')}</h2>
        {weak.length ? (
          <ul className="grid gap-1 rounded-2xl bg-cloud p-3">
            {weak.map(([id, m]) => (
              <li key={id} className="flex justify-between gap-2">
                <span>
                  <Lg>{getWord(id).lg}</Lg> = {getWord(id)[track]}
                </span>
                <span className="text-ink-soft">
                  ✓{m.correct} ✗{m.wrong}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('parent.noWeakWords')}</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border-2 border-lake bg-lake-soft p-4">
        <h2 className="font-display text-xl font-semibold">{t('parent.privacyTitle')}</h2>
        <p>{t('parent.privacy')}</p>
      </section>

      <section className="mt-4 rounded-2xl bg-cloud p-4">
        <h2 className="font-display text-xl font-semibold">{t('parent.about')}</h2>
        <p>{t('parent.aboutBody')}</p>
        <p className="mt-2">{t('parent.audioNote')}</p>
      </section>

      <section className="mt-6">
        {erased ? (
          <p role="status" className="rounded-2xl bg-leaf-soft p-4 font-bold text-leaf-dark">
            {t('parent.resetDone')}
          </p>
        ) : confirming ? (
          <div className="rounded-2xl border-2 border-crane bg-crane-soft p-4" role="alertdialog" aria-labelledby="reset-q">
            <p id="reset-q" className="mb-3 font-bold">
              {t('parent.resetConfirm')}
            </p>
            <div className="grid gap-2">
              <Button variant="danger" block onClick={() => (reset(), setErased(true))} data-testid="reset-yes">
                {t('parent.resetYes')}
              </Button>
              <Button variant="ghost" block onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" block onClick={() => setConfirming(true)} data-testid="reset">
            🗑️ {t('parent.reset')}
          </Button>
        )}
      </section>
    </div>
  )
}
