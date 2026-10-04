import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CompleteScreen } from '../components/CompleteScreen'
import { LessonPlayer, type Session } from '../components/LessonPlayer'
import { NoHearts } from '../components/NoHearts'
import { getLessonRef } from '../content'
import { generateLesson } from '../logic/generator'
import { completeLesson } from '../logic/progress'
import { pickPracticeWords } from '../logic/srs'
import { isLessonUnlocked } from '../logic/unlock'
import { useApp } from '../state/AppState'

export function LessonScreen() {
  const { lessonId = '' } = useParams()
  const { state, hearts, track, update, t } = useApp()
  const navigate = useNavigate()
  const ref = getLessonRef(lessonId)
  const startXp = useRef(state.xp)
  const [done, setDone] = useState<{ mistakes: number; badges: string[] } | null>(null)
  const [outOfHearts, setOutOfHearts] = useState(hearts <= 0)

  const exercises = useMemo(
    () => (ref ? generateLesson(lessonId, { lang: track, seed: Date.now(), weakWords: pickPracticeWords(state.memory, Date.now(), 4) }) : []),
    // A new set of exercises only when the lesson or track changes.
    [lessonId, track],
  )

  if (!ref || !isLessonUnlocked(state, lessonId)) return <Navigate to="/" replace />
  if (outOfHearts && !done) return <NoHearts />

  if (done)
    return (
      <CompleteScreen
        title={t('lesson.complete')}
        xp={state.xp - startXp.current}
        mistakes={done.mistakes}
        badges={done.badges}
        onContinue={() => navigate('/', { replace: true })}
      />
    )

  const finish = (s: Session) => {
    const badges = update((st) => completeLesson(st, { lessonId, mistakes: s.mistakes }, new Date()))
    setDone({ mistakes: s.mistakes, badges })
  }

  return <LessonPlayer exercises={exercises} mode="lesson" onFinish={finish} onExit={() => navigate('/', { replace: true })} onOutOfHearts={() => setOutOfHearts(true)} />
}
