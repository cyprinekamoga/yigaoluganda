import { Fragment, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { CompleteScreen } from '../components/CompleteScreen'
import { LessonPlayer, type Session } from '../components/LessonPlayer'
import { Lg } from '../components/Lg'
import { ProgressBar } from '../components/ProgressBar'
import { Scene } from '../components/Scene'
import { getChapter, getWord, hasWord, story, type Lang, type StoryLine } from '../content'
import { generateStoryQuiz } from '../logic/generator'
import { completeStory } from '../logic/progress'
import { isChapterUnlocked } from '../logic/unlock'
import { useApp } from '../state/AppState'

/** Story mode: illustrated scenes, tappable Luganda words, line-by-line translation, then questions. */
export function StoryScreen() {
  const { chapterId = '' } = useParams()
  const { state, track, ui, t, update } = useApp()
  const navigate = useNavigate()
  const chapter = getChapter(chapterId)
  const [page, setPage] = useState(0)
  const [quiz, setQuiz] = useState(false)
  const [done, setDone] = useState<{ mistakes: number; badges: string[] } | null>(null)
  const startXp = useRef(state.xp)
  const exercises = useMemo(() => (chapter ? generateStoryQuiz(chapter.questions, track, chapter.id) : []), [chapter, track])

  if (!chapter || !isChapterUnlocked(state, chapterId)) return <Navigate to="/stories" replace />
  const n = story.chapters.indexOf(chapter) + 1

  if (done)
    return (
      <CompleteScreen title={t('lesson.storyComplete')} xp={state.xp - startXp.current} mistakes={done.mistakes} badges={done.badges} onContinue={() => navigate('/stories', { replace: true })} />
    )

  if (quiz) {
    const finish = (s: Session) => {
      const badges = update((st) => completeStory(st, chapter.id, new Date()))
      setDone({ mistakes: s.mistakes, badges })
    }
    return <LessonPlayer exercises={exercises} mode="story" onFinish={finish} onExit={() => setQuiz(false)} onOutOfHearts={() => undefined} />
  }

  const scene = chapter.scenes[page]
  const last = page === chapter.scenes.length - 1
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-32 pt-4" data-testid="story">
      <header className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/stories')} aria-label={t('common.close')} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-3xl text-stone hover:bg-cloud">
          <span aria-hidden="true">✕</span>
        </button>
        <ProgressBar value={(page + 1) / chapter.scenes.length} label={t('a11y.progress')} />
      </header>
      <p className="text-sm font-bold text-ink-soft">{t('story.chapter', { n })}</p>
      <h1 className="font-display text-2xl font-bold">{chapter.title[ui]}</h1>
      <p className="mb-4 text-ink-soft">
        <Lg>{chapter.lgTitle}</Lg>
      </p>

      <Scene name={scene.scene} props={scene.props} />

      <p className="mt-5 text-xl leading-relaxed" data-testid="narration">
        <Narration text={scene.text[track]} lang={track} />
      </p>
      <p className="mt-1 text-sm text-ink-soft">{t('exercise.tapWord')}</p>

      {scene.lines && (
        <ul className="mt-5 grid gap-3">
          {scene.lines.map((line, i) => (
            <DialogueLine key={`${page}-${i}`} line={line} lang={track} />
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-mist/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3 px-4">
          {page > 0 && (
            <Button variant="ghost" onClick={() => setPage(page - 1)}>
              {t('common.back')}
            </Button>
          )}
          {last ? (
            <Button block variant="success" onClick={() => { startXp.current = state.xp; setQuiz(true) }} data-testid="story-questions">
              {t('story.startQuestions')}
            </Button>
          ) : (
            <Button block onClick={() => setPage(page + 1)} data-testid="story-next">
              {t('common.next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Narration where {wordId} becomes a highlighted Luganda word; tapping it shows the meaning. */
function Narration({ text, lang }: { text: string; lang: Lang }) {
  const [open, setOpen] = useState<number | null>(null)
  const parts = text.split(/(\{[^}]+\})/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\{([^}]+)\}$/.exec(part)
        if (!m || !hasWord(m[1])) return <Fragment key={i}>{part}</Fragment>
        const w = getWord(m[1])
        const shown = open === i
        return (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(shown ? null : i)}
            aria-expanded={shown}
            className="mx-0.5 rounded-lg bg-sun-soft px-1.5 font-bold text-crane underline decoration-dotted underline-offset-4"
          >
            <Lg>{w.lg}</Lg>
            {shown && <span className="ml-1 font-semibold text-ink"> = {w[lang]}</span>}
          </button>
        )
      })}
    </>
  )
}

function DialogueLine({ line, lang }: { line: StoryLine; lang: Lang }) {
  const { t, ui } = useApp()
  const [show, setShow] = useState(false)
  const speaker = story.speakers[line.speaker]
  const name = typeof speaker.name === 'string' ? speaker.name : speaker.name[ui]
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cloud text-3xl">
        {speaker.emoji}
      </span>
      <div className="flex-1 rounded-3xl rounded-tl-md border-2 border-line bg-cloud p-3">
        <p className="text-sm font-bold text-ink-soft">{name}</p>
        <p className="text-2xl">
          <Lg>{line.lg}</Lg>
        </p>
        {show && <p className="mt-1 text-lg text-lake-dark" data-testid="line-translation">{line[lang]}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={() => setShow(!show)} aria-expanded={show} className="min-h-11 rounded-xl border-2 border-lake px-3 font-bold text-lake-dark" data-testid="toggle-translation">
            {show ? t('story.hideTranslation') : t('story.showTranslation')}
          </button>
        </div>
      </div>
    </li>
  )
}
