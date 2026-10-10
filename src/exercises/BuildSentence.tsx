import { useMemo, useState } from 'react'
import { getWord } from '../content'
import { Lg } from '../components/Lg'
import { normalize, tilesMatch, toTiles } from '../logic/answer'
import { useApp } from '../state/AppState'
import { E2E } from '../state/e2e'
import { Instruction } from './ExerciseView'
import type { ExerciseProps } from './types'

/** Build a Luganda phrase from word tiles. Tiles are Luganda only: no word-by-word matching. */
export function BuildSentence({ exercise, lang, checked, setPending }: ExerciseProps<'build'>) {
  const { t } = useApp()
  const word = getWord(exercise.wordId)
  const answerTiles = useMemo(() => toTiles(word.lg), [word.lg])
  // Each tile is identified by its position in the bank, so repeated words work.
  const [chosen, setChosen] = useState<number[]>([])
  // For automated tests only: which bank tile goes in which position.
  const orderOf = useMemo(() => {
    const map = new Map<number, number>()
    answerTiles.forEach((a, k) => {
      const i = exercise.tiles.findIndex((tile, j) => !map.has(j) && normalize(tile) === normalize(a))
      if (i >= 0) map.set(i, k)
    })
    return map
  }, [answerTiles, exercise.tiles])

  const update = (next: number[]) => {
    setChosen(next)
    const words = next.map((i) => exercise.tiles[i])
    setPending(next.length ? { correct: tilesMatch(words, word.lg), solution: word.lg, solutionIsLuganda: true, meaning: word[lang] } : null)
  }

  return (
    <div>
      <Instruction>{t('exercise.build')}</Instruction>
      <div className="mb-5 rounded-3xl bg-cloud p-5 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
        <p className="font-display text-2xl font-semibold">{word[lang]}</p>
      </div>
      <p className="sr-only">{t('exercise.buildHint')}</p>
      <div className="mb-6 flex min-h-20 flex-wrap content-start gap-2 border-b-[3px] border-line pb-3" aria-live="polite" data-testid="build-answer">
        {chosen.map((i) => (
          <button
            key={i}
            type="button"
            disabled={checked}
            onClick={() => update(chosen.filter((c) => c !== i))}
            className="btn-3d min-h-14 rounded-xl border-[3px] border-lake bg-lake-soft px-4 text-xl [--edge:var(--color-lake)]"
          >
            <Lg>{exercise.tiles[i]}</Lg>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {exercise.tiles.map((tile, i) => {
          const used = chosen.includes(i)
          const order = orderOf.get(i) ?? -1
          return (
            <button
              key={i}
              type="button"
              disabled={used || checked}
              onClick={() => update([...chosen, i])}
              data-testid="tile"
              {...(E2E ? { 'data-order': String(order) } : {})}
              className={`btn-3d min-h-14 rounded-xl border-[3px] px-4 text-xl ${used ? 'border-line bg-line text-transparent shadow-none' : 'border-line bg-cloud [--edge:var(--color-line)]'}`}
            >
              <Lg>{tile}</Lg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
