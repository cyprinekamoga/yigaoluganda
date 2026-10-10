import { useState } from 'react'
import { getWord } from '../content'
import { checkAnswer } from '../logic/answer'
import { useApp } from '../state/AppState'
import { E2E } from '../state/e2e'
import { Instruction } from './ExerciseView'
import type { ExerciseProps } from './types'

/** Type the Luganda word. Forgiving about case, spaces and accents; gentle about double letters. */
export function TypeAnswer({ exercise, lang, checked, setPending }: ExerciseProps<'type'>) {
  const { t } = useApp()
  const word = getWord(exercise.wordId)
  const [value, setValue] = useState('')

  const change = (v: string) => {
    setValue(v)
    if (!v.trim()) return setPending(null)
    const result = checkAnswer(v, [word.lg, ...(word.variants ?? [])])
    setPending({
      correct: result === 'correct',
      nearMissDoubles: result === 'near-miss-doubles',
      solution: word.lg,
      solutionIsLuganda: true,
      meaning: word[lang],
    })
  }

  return (
    <div>
      <Instruction>{t('exercise.type')}</Instruction>
      <div className="mb-5 rounded-3xl bg-cloud p-5 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
        <p className="font-display text-3xl font-semibold">{word[lang]}</p>
        <p className="mt-2 text-lg text-ink-soft">{t('exercise.typeHint', { letter: word.lg.charAt(0).toLowerCase() })}</p>
      </div>
      <label className="sr-only" htmlFor="type-answer">
        {t('exercise.typePlaceholder')}
      </label>
      <input
        id="type-answer"
        lang="lg"
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={checked}
        value={value}
        onChange={(e) => change(e.target.value)}
        placeholder={t('exercise.typePlaceholder')}
        data-testid="type-input"
        {...(E2E ? { 'data-answer': word.lg } : {})}
        className="min-h-16 w-full rounded-2xl border-[3px] border-line bg-cloud px-4 text-2xl focus:border-lake focus:outline-none"
      />
    </div>
  )
}
