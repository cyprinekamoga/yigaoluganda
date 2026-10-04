import { useMemo, useState } from 'react'
import { getWord } from '../content'
import { Lg } from '../components/Lg'
import { createRng, hashString, shuffle } from '../logic/rng'
import { useApp } from '../state/AppState'
import { E2E } from '../state/e2e'
import { Instruction } from './ExerciseView'
import type { ExerciseProps } from './types'

type Side = 'lg' | 'meaning'

/** Tap a Luganda word and its meaning. A wrong pair just wiggles: no hearts are lost here. */
export function MatchPairs({ exercise, lang, submit }: ExerciseProps<'pairs'>) {
  const { t } = useApp()
  const ids = exercise.wordIds
  const [left, right] = useMemo(() => {
    const rng = createRng(hashString(exercise.id))
    return [shuffle(ids, rng), shuffle(ids, rng)]
  }, [exercise.id, ids])
  const [picked, setPicked] = useState<{ side: Side; id: string } | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const [missed, setMissed] = useState<Record<string, boolean>>({})

  const tap = (side: Side, id: string) => {
    if (matched.includes(id)) return
    if (!picked || picked.side === side) {
      setPicked({ side, id })
      return
    }
    if (picked.id === id) {
      const next = [...matched, id]
      setMatched(next)
      setPicked(null)
      if (next.length === ids.length) {
        const wordResults = Object.fromEntries(ids.map((w) => [w, !missed[w]]))
        submit({ correct: true, solution: '', solutionIsLuganda: false, wordResults })
      }
    } else {
      setMissed((m) => ({ ...m, [picked.id]: true, [id]: true }))
      setWrong(`${side}:${id}`)
      setTimeout(() => setWrong(null), 450)
      setPicked(null)
    }
  }

  const cell = (side: Side, id: string) => {
    const w = getWord(id)
    const done = matched.includes(id)
    const sel = picked?.side === side && picked.id === id
    const isWrong = wrong === `${side}:${id}`
    return (
      <button
        key={`${side}-${id}`}
        type="button"
        disabled={done}
        onClick={() => tap(side, id)}
        aria-pressed={sel}
        data-testid={`pair-${side}`}
        {...(E2E ? { 'data-pair': id } : {})}
        className={`btn-3d min-h-16 rounded-2xl border-[3px] px-3 py-2 text-lg sm:text-xl
          ${done ? 'border-leaf bg-leaf-soft text-leaf-dark opacity-70 [--edge:transparent]' : sel ? 'border-lake bg-lake-soft [--edge:var(--color-lake)]' : 'border-line bg-cloud [--edge:var(--color-line)]'}
          ${isWrong ? 'animate-wiggle border-crane' : ''}`}
      >
        {side === 'lg' ? <Lg>{w.lg}</Lg> : w[lang]}
      </button>
    )
  }

  return (
    <div>
      <Instruction>{t('exercise.pairs')}</Instruction>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3">{left.map((id) => cell('lg', id))}</div>
        <div className="grid gap-3">{right.map((id) => cell('meaning', id))}</div>
      </div>
    </div>
  )
}
