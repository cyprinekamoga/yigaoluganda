import { ClockFace } from './ClockFace'

/**
 * Draws a word's picture from its `image` field:
 *   an emoji ("🐄"), `count:N` (N things to count, like the book's number page) or `clock:H`.
 */
export function WordPicture({ image, size = 'md' }: { image: string; size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 44, md: 64, lg: 96 }[size]
  const count = /^count:(\d+)$/.exec(image)
  if (count) {
    const n = Number(count[1])
    if (n === 0)
      return (
        <span className="grid place-items-center rounded-2xl border-4 border-dashed border-line font-display text-stone" style={{ width: px * 1.2, height: px * 0.9 }} aria-hidden="true">
          0
        </span>
      )
    return (
      <span className="flex max-w-40 flex-wrap justify-center gap-0.5 leading-none" style={{ fontSize: px * (n > 6 ? 0.3 : 0.42) }} aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span key={i}>🐴</span>
        ))}
      </span>
    )
  }
  const clock = /^clock:(\d+)$/.exec(image)
  if (clock) return <ClockFace hour={Number(clock[1])} size={px * 1.15} />
  return (
    <span className="leading-none" style={{ fontSize: px }} aria-hidden="true">
      {image}
    </span>
  )
}
