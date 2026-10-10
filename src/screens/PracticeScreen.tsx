import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { CompleteScreen } from '../components/CompleteScreen'
import { Layout } from '../components/Layout'
import { LessonPlayer, type Session } from '../components/LessonPlayer'
import { Mascot } from '../components/Mascot'
import { generatePractice, type Exercise } from '../logic/generator'
import { completePractice } from '../logic/progress'
import { countDue, pickPracticeWords } from '../logic/srs'
import { useApp } from '../state/AppState'

/** Practice brings back weak words (spaced repetition). */
export function PracticeScreen() {
  const { state, track, update, t, now } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const startXp = useRef(state.xp)
  const words = pickPracticeWords(state.memory, now, 6)
  const make = () => (words.length ? generatePractice(words, { lang: track, seed: Date.now() }) : null)
  const [exercises, setExercises] = useState<Exercise[] | null>(() => (params.get('start') ? make() : null))
  const [done, setDone] = useState<{ mistakes: number; badges: string[] } | null>(null)

  if (done)
    return (
      <CompleteScreen
        title={t('lesson.practiceComplete')}
        xp={state.xp - startXp.current}
        mistakes={done.mistakes}
        badges={done.badges}
        onContinue={() => navigate('/', { replace: true })}
      />
    )

  if (exercises) {
    const finish = (s: Session) => {
      const badges = update((st) => completePractice(st, new Date()))
      setDone({ mistakes: s.mistakes, badges })
    }
    return <LessonPlayer exercises={exercises} mode="practice" onFinish={finish} onExit={() => setExercises(null)} />
  }

  const due = countDue(state.memory, now)
  return (
    <Layout title={t('practice.title')}>
      <div className="flex flex-col items-center rounded-3xl bg-cloud p-6 text-center shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
        <Mascot mood="think" size={110} />
        <h1 className="mt-3 font-display text-3xl font-bold">{t('practice.title')}</h1>
        {words.length ? (
          <>
            <p className="mt-2 text-lg">{t('practice.intro')}</p>
            <p className="mt-2 font-bold text-lake-dark">{t('practice.due', { n: Math.max(due, words.length) })}</p>
            <Button className="mt-6" block variant="success" onClick={() => { startXp.current = state.xp; setExercises(make()) }} data-testid="start-practice">
              {t('practice.start')}
            </Button>
          </>
        ) : (
          <p className="mt-2 text-lg">{t('practice.empty')}</p>
        )}
      </div>
    </Layout>
  )
}
