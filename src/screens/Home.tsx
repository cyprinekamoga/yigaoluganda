import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Lg } from '../components/Lg'
import { Mascot } from '../components/Mascot'
import { allLessons, story, units, type Unit } from '../content'
import { isChapterUnlocked, isLessonUnlocked, nextLessonId } from '../logic/unlock'
import { useApp } from '../state/AppState'

/** Unit colours cycle through the palette, so each part of the journey feels different. */
const UNIT_COLORS = [
  { band: 'bg-lake text-white', node: 'bg-lake [--edge:var(--color-lake-dark)]' },
  { band: 'bg-leaf text-white', node: 'bg-leaf [--edge:var(--color-leaf-dark)]' },
  { band: 'bg-crane text-white', node: 'bg-crane [--edge:#8e0b20]' },
  { band: 'bg-sun text-ink', node: 'bg-sun text-ink [--edge:#c99400]' },
]

/** Stepping stones that cross the river from bank to bank. */
const OFFSETS = [-70, 0, 70, 0]
const ROW = 104

export function Home() {
  const { t, state } = useApp()
  const nextId = nextLessonId(state)
  const currentRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-3 rounded-3xl bg-cloud p-4 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
        <Mascot size={70} mood={nextId ? 'happy' : 'cheer'} label={t('a11y.mascot', { mascot: state.settings.mascotName })} />
        <div>
          <p className="font-display text-lg font-semibold text-lake-dark">{state.settings.mascotName}</p>
          <p className="text-lg">{nextId ? t('home.greeting') : t('home.greetingDone')}</p>
        </div>
      </div>

      {units.map((unit, ui) => (
        <UnitSection key={unit.id} unit={unit} index={ui} nextId={nextId} currentRef={currentRef} />
      ))}
    </Layout>
  )
}

function UnitSection({ unit, index, nextId, currentRef }: { unit: Unit; index: number; nextId?: string; currentRef: React.RefObject<HTMLAnchorElement | null> }) {
  const { t, state, ui } = useApp()
  const color = UNIT_COLORS[index % UNIT_COLORS.length]
  const firstIndex = allLessons.findIndex((r) => r.unit.id === unit.id)
  const chapter = unit.story ? story.chapters.find((c) => c.id === unit.story) : undefined
  const nodes = unit.lessons.length + (chapter ? 1 : 0)
  const height = nodes * ROW
  const points = Array.from({ length: nodes }, (_, i) => [OFFSETS[(firstIndex + i) % OFFSETS.length], i * ROW + 44])
  const riverPath = points
    .map(([x, y], i) => (i === 0 ? `M${x} 0 L${x} ${y}` : `C${points[i - 1][0]} ${y - ROW / 2} ${x} ${y - ROW / 2} ${x} ${y}`))
    .join(' ')

  return (
    <section aria-labelledby={`unit-${unit.id}`} className="mb-10">
      <div className={`rounded-3xl p-4 ${color.band}`}>
        <p className="text-sm font-bold opacity-90">
          {t('home.unit', { n: index + 1 })} · {t('home.bookPages', { pages: unit.pages })}
        </p>
        <h2 id={`unit-${unit.id}`} className="font-display text-2xl font-semibold">
          <span aria-hidden="true">{unit.emoji} </span>
          {unit.title[ui]}
        </h2>
        {unit.lgTitle && (
          <p className="text-lg opacity-95">
            <Lg>{unit.lgTitle}</Lg>
          </p>
        )}
      </div>

      {unit.culture && (
        <aside className="mt-3 rounded-2xl border-2 border-sun bg-sun-soft p-3">
          <p className="font-bold">💡 {t('home.didYouKnow')}</p>
          <p>{unit.culture[state.settings.uiLang]}</p>
        </aside>
      )}

      <div className="relative mt-6" style={{ height }}>
        <svg className="pointer-events-none absolute left-1/2 top-0 overflow-visible" width="1" height={height} aria-hidden="true">
          <path d={riverPath} stroke="var(--color-lake-soft)" strokeWidth="30" fill="none" strokeLinecap="round" />
          <path d={riverPath} stroke="#fff" strokeWidth="3" strokeDasharray="2 12" fill="none" strokeLinecap="round" />
        </svg>
        <ol className="relative">
          {unit.lessons.map((lesson, i) => {
            const done = Boolean(state.completedLessons[lesson.id])
            const open = isLessonUnlocked(state, lesson.id)
            const isNext = lesson.id === nextId
            const [x] = points[i]
            const label = `${lesson.title[ui]}${done ? ' ✓' : open ? '' : ` (${t('home.locked')})`}`
            return (
              <li key={lesson.id} className="absolute left-1/2 flex flex-col items-center" style={{ top: i * ROW, transform: `translateX(calc(-50% + ${x}px))` }}>
                {open ? (
                  <Link
                    to={`/lesson/${lesson.id}`}
                    ref={isNext ? currentRef : undefined}
                    aria-label={label}
                    data-testid={`lesson-${lesson.id}`}
                    className={`btn-3d grid h-[76px] w-[76px] place-items-center rounded-[26px] font-display text-3xl font-bold ${done ? 'bg-sun text-ink [--edge:#c99400]' : `${color.node} text-white`} ${isNext ? 'ring-8 ring-sun/50' : ''}`}
                  >
                    <span aria-hidden="true">{done ? '✓' : isNext ? '▶' : firstIndex + i + 1}</span>
                  </Link>
                ) : (
                  <span aria-label={label} role="img" className="grid h-[76px] w-[76px] place-items-center rounded-[26px] border-[3px] border-dashed border-line bg-cloud text-2xl">
                    <span aria-hidden="true">🔒</span>
                  </span>
                )}
                <span className={`mt-1 max-w-32 text-center text-sm font-bold leading-tight ${open ? 'text-ink' : 'text-stone'}`}>{lesson.title[ui]}</span>
                {isNext && (
                  <span className="absolute -top-9 whitespace-nowrap rounded-xl bg-cloud px-3 py-1 font-display text-base font-semibold text-lake-dark shadow-[0_6px_16px_-12px_rgba(43,29,20,0.4)]">
                    {t('home.start')}
                  </span>
                )}
              </li>
            )
          })}
          {chapter && <StoryNode chapterId={chapter.id} top={unit.lessons.length * ROW} x={points[unit.lessons.length][0]} />}
        </ol>
      </div>
    </section>
  )
}

function StoryNode({ chapterId, top, x }: { chapterId: string; top: number; x: number }) {
  const { t, state, ui } = useApp()
  const chapter = story.chapters.find((c) => c.id === chapterId)!
  const open = isChapterUnlocked(state, chapterId)
  const done = Boolean(state.completedStories[chapterId])
  const n = story.chapters.indexOf(chapter) + 1
  const inner = (
    <span aria-hidden="true" className="text-3xl">
      {done ? '📗' : open ? '📖' : '🔒'}
    </span>
  )
  const label = `${t('home.story')}: ${chapter.title[ui]}${open ? '' : ` (${t('home.storyLocked')})`}`
  return (
    <li className="absolute left-1/2 flex flex-col items-center" style={{ top, transform: `translateX(calc(-50% + ${x}px))` }}>
      {open ? (
        <Link to={`/story/${chapterId}`} aria-label={label} data-testid={`story-${chapterId}`} className="btn-3d grid h-[76px] w-[76px] place-items-center rounded-3xl border-4 border-sun bg-cloud [--edge:#c99400]">
          {inner}
        </Link>
      ) : (
        <span role="img" aria-label={label} className="grid h-[76px] w-[76px] place-items-center rounded-3xl border-4 border-dashed border-line bg-mist">
          {inner}
        </span>
      )}
      <span className={`mt-1 max-w-32 text-center text-sm font-bold leading-tight ${open ? 'text-ink' : 'text-stone'}`}>
        {t('story.chapter', { n })}
      </span>
    </li>
  )
}
