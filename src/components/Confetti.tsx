import { useMemo } from 'react'

const COLORS = ['#ffc72c', '#c8102e', '#0b5cad', '#1e7b34', '#1e1b18']

/** A short burst of confetti. Hidden when the user prefers reduced motion (see index.css). */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: COLORS[i % COLORS.length],
        size: 8 + Math.random() * 6,
      })),
    [pieces],
  )
  return (
    <div aria-hidden="true">
      {items.map((p, i) => (
        <span key={i} className="confetti" style={{ left: `${p.left}vw`, animationDelay: `${p.delay}s`, background: p.color, width: p.size }} />
      ))}
    </div>
  )
}
