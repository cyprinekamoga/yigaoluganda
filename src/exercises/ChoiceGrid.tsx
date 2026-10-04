import type { ReactNode } from 'react'
import { e2eAttr } from '../state/e2e'

export interface Choice {
  key: string
  content: ReactNode
  correct: boolean
  /** Accessible name (for picture-only choices). */
  label?: string
}

interface Props {
  choices: Choice[]
  selected: string | null
  onSelect: (key: string) => void
  checked: boolean
  layout?: 'pictures' | 'list'
}

/** Big answer cards. After checking: the right one turns green, a wrong pick turns soft red. */
export function ChoiceGrid({ choices, selected, onSelect, checked, layout = 'list' }: Props) {
  return (
    <div role="radiogroup" className={layout === 'pictures' ? 'grid grid-cols-3 gap-3' : 'grid gap-3'}>
      {choices.map((c, i) => {
        const isSel = selected === c.key
        const state = checked ? (c.correct ? 'right' : isSel ? 'wrong' : 'idle') : isSel ? 'selected' : 'idle'
        const look = {
          idle: 'border-line bg-cloud [--edge:var(--color-line)]',
          selected: 'border-lake bg-lake-soft [--edge:var(--color-lake)]',
          right: 'border-leaf bg-leaf-soft [--edge:var(--color-leaf)] animate-pop',
          wrong: 'border-crane bg-crane-soft [--edge:var(--color-crane)] animate-wiggle',
        }[state]
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={isSel}
            aria-label={c.label}
            disabled={checked}
            onClick={() => onSelect(c.key)}
            data-testid="choice"
            {...e2eAttr(c.correct)}
            className={`btn-3d relative flex items-center gap-3 rounded-2xl border-[3px] text-left ${look}
              ${layout === 'pictures' ? 'aspect-square flex-col justify-center p-2' : 'min-h-16 px-4 py-3 text-xl'}`}
          >
            {layout === 'list' && (
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-line font-display text-base text-ink-soft">
                {i + 1}
              </span>
            )}
            <span className={layout === 'pictures' ? 'grid place-items-center' : 'flex-1 break-words'}>{c.content}</span>
            {checked && c.correct && (
              <span aria-hidden="true" className="absolute right-2 top-2 text-lg">
                ✅
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
