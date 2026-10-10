import { useEffect, useState, type ReactNode } from 'react'
import { getWord, hasAudio } from '../content'
import { Lg } from '../components/Lg'
import { SpeakerButton } from '../components/SpeakerButton'
import { WordPicture } from '../components/WordPicture'
import { useApp } from '../state/AppState'
import { ChoiceGrid, type Choice } from './ChoiceGrid'
import { BuildSentence } from './BuildSentence'
import { MatchPairs } from './MatchPairs'
import { TypeAnswer } from './TypeAnswer'
import type { ExerciseProps } from './types'

/** Picks the right view for an exercise. */
export function ExerciseView(props: ExerciseProps) {
  const { exercise } = props
  switch (exercise.kind) {
    case 'pairs':
      return <MatchPairs {...(props as ExerciseProps<'pairs'>)} />
    case 'build':
      return <BuildSentence {...(props as ExerciseProps<'build'>)} />
    case 'type':
      return <TypeAnswer {...(props as ExerciseProps<'type'>)} />
    default:
      return <SingleChoice {...props} />
  }
}

export function Instruction({ children }: { children: ReactNode }) {
  return <h2 className="mb-5 font-display text-2xl font-semibold text-ink sm:text-3xl">{children}</h2>
}

/** Every exercise where the child picks one answer. */
function SingleChoice({ exercise, lang, checked, setPending }: ExerciseProps) {
  const { t } = useApp()
  const [selected, setSelected] = useState<string | null>(null)

  let instruction = ''
  let prompt: ReactNode = null
  let layout: 'pictures' | 'list' = 'list'
  let choices: Choice[] = []
  let solution = ''
  let solutionIsLuganda = true
  let meaning: string | undefined

  switch (exercise.kind) {
    case 'wordToPicture': {
      const w = getWord(exercise.wordId)
      instruction = t('exercise.wordToPicture')
      prompt = (
        <WordCard badge={exercise.intro ? t('exercise.newWord') : undefined} wordId={w.id}>
          <Lg className="font-display text-4xl">{w.lg}</Lg>
          {exercise.intro && <p className="mt-1 text-lg text-ink-soft">{t('exercise.newWordHint', { meaning: w[lang] })}</p>}
        </WordCard>
      )
      layout = 'pictures'
      choices = exercise.options.map((id) => {
        const o = getWord(id)
        return { key: id, correct: id === w.id, label: o[lang], content: <WordPicture image={o.image ?? '❓'} size="md" /> }
      })
      solution = w.lg
      meaning = w[lang]
      break
    }
    case 'pictureToWord': {
      const w = getWord(exercise.wordId)
      instruction = t('exercise.pictureToWord')
      prompt = (
        <div className="mx-auto mb-6 grid min-h-36 w-fit min-w-36 place-items-center rounded-3xl bg-cloud p-5 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
          <WordPicture image={w.image ?? '❓'} size="lg" />
        </div>
      )
      choices = exercise.options.map((id) => ({ key: id, correct: id === w.id, content: <Lg>{getWord(id).lg}</Lg> }))
      solution = w.lg
      meaning = w[lang]
      break
    }
    case 'translate': {
      const w = getWord(exercise.wordId)
      const from = exercise.direction === 'fromLuganda'
      instruction = t(from ? 'exercise.translateFromLuganda' : 'exercise.translateToLuganda')
      prompt = from ? (
        <WordCard wordId={w.id} badge={exercise.intro ? t('exercise.newWord') : undefined}>
          <Lg className="font-display text-4xl">{w.lg}</Lg>
          {exercise.intro && <p className="mt-1 text-lg text-ink-soft">{t('exercise.newWordHint', { meaning: w[lang] })}</p>}
        </WordCard>
      ) : (
        <WordCard>
          <span className="font-display text-3xl font-semibold">{w[lang]}</span>
        </WordCard>
      )
      choices = exercise.options.map((id) => {
        const o = getWord(id)
        return { key: id, correct: id === w.id, content: from ? o[lang] : <Lg>{o.lg}</Lg> }
      })
      solution = from ? w[lang] : w.lg
      solutionIsLuganda = !from
      meaning = from ? undefined : w[lang]
      if (from) solution = `${w.lg} = ${w[lang]}`
      break
    }
    case 'listen': {
      const w = getWord(exercise.wordId)
      instruction = t('exercise.listen')
      prompt = (
        <div className="mb-6 flex justify-center">
          <SpeakerButton wordId={w.id} size="lg" autoFocus />
        </div>
      )
      choices = exercise.options.map((id) => ({ key: id, correct: id === w.id, content: <Lg>{getWord(id).lg}</Lg> }))
      solution = w.lg
      meaning = w[lang]
      break
    }
    case 'fill': {
      instruction = t('exercise.fill')
      const [before, after = ''] = exercise.text.split('___')
      const chosen = selected ?? ''
      const gap = (
        <span className={`mx-1 inline-block min-w-24 rounded-xl border-b-4 px-2 text-center ${selected ? 'border-lake bg-lake-soft' : 'border-stone bg-cloud'}`}>
          {chosen ? <Lg>{chosen}</Lg> : ' '}
        </span>
      )
      prompt = (
        <div className="mb-6 rounded-3xl bg-cloud p-5 text-2xl leading-relaxed shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
          <p {...(exercise.textIsLuganda ? { lang: 'lg' } : {})}>
            {before}
            {gap}
            {after}
          </p>
          {exercise.hint && <p className="mt-2 text-lg text-ink-soft">{exercise.hint}</p>}
        </div>
      )
      choices = exercise.options.map((o) => ({ key: o, correct: o === exercise.answer, content: <Lg>{o}</Lg> }))
      solution = exercise.text.replace('___', exercise.answer)
      solutionIsLuganda = exercise.textIsLuganda
      meaning = exercise.hint
      break
    }
    case 'question': {
      instruction = t('exercise.question')
      prompt = (
        <div className="mb-6 flex items-center gap-4 rounded-3xl bg-cloud p-5 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
          {exercise.image && <WordPicture image={exercise.image} size="md" />}
          <p className="text-2xl font-semibold">{exercise.prompt}</p>
        </div>
      )
      choices = exercise.options.map((o, i) => ({
        key: String(i),
        correct: i === exercise.answer,
        content: o.luganda ? <Lg>{o.text}</Lg> : o.text,
      }))
      const right = exercise.options[exercise.answer]
      solution = right.text
      solutionIsLuganda = right.luganda
      break
    }
  }

  const select = (key: string) => {
    if (checked) return
    setSelected(key)
    const choice = choices.find((c) => c.key === key)!
    setPending({ correct: choice.correct, solution, solutionIsLuganda, meaning })
  }

  // Number keys 1–9 pick an answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const n = Number(e.key)
      if (n >= 1 && n <= choices.length) select(choices[n - 1].key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div>
      <Instruction>{instruction}</Instruction>
      {prompt}
      <ChoiceGrid choices={choices} selected={selected} onSelect={select} checked={checked} layout={layout} />
    </div>
  )
}

/** The word being asked about, with its recording when one exists. */
function WordCard({ children, wordId, badge }: { children: ReactNode; wordId?: string; badge?: string }) {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-3xl bg-cloud p-5 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
      {wordId && hasAudio(wordId) && <SpeakerButton wordId={wordId} />}
      <div className="flex-1">
        {badge && <span className="mb-1 inline-block rounded-full bg-sun px-3 py-0.5 text-sm font-bold text-ink">{badge}</span>}
        <div>{children}</div>
      </div>
    </div>
  )
}
