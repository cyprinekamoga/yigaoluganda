import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Lg } from '../components/Lg'
import { story, units } from '../content'
import { isChapterUnlocked } from '../logic/unlock'
import { useApp } from '../state/AppState'

export function StoriesScreen() {
  const { t, state, ui } = useApp()
  return (
    <Layout title={t('story.title')}>
      <h1 className="font-display text-3xl font-bold">{story.title[ui]}</h1>
      <p className="mb-5 text-lg text-ink-soft">
        <Lg>{story.lgTitle}</Lg> · {t('story.subtitle')}
      </p>
      <ol className="grid gap-3">
        {story.chapters.map((c, i) => {
          const open = isChapterUnlocked(state, c.id)
          const done = Boolean(state.completedStories[c.id])
          const unitNo = units.findIndex((u) => u.id === c.unit) + 1
          const body = (
            <>
              <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sun-soft text-3xl">
                {open ? (done ? '📗' : '📖') : '🔒'}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink-soft">{t('story.chapter', { n: i + 1 })}</span>
                <span className="block font-display text-xl font-semibold">{c.title[ui]}</span>
                <span className="block text-ink-soft">
                  {open ? <Lg>{c.lgTitle}</Lg> : t('story.locked', { n: unitNo })}
                </span>
              </span>
              {done && <span className="rounded-full bg-leaf-soft px-3 py-1 text-sm font-bold text-leaf-dark">{t('story.done')}</span>}
            </>
          )
          return (
            <li key={c.id}>
              {open ? (
                <Link to={`/story/${c.id}`} className="btn-3d flex items-center gap-3 rounded-3xl border-2 border-line bg-cloud p-3 [--edge:var(--color-line)]">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-line p-3 opacity-80">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </Layout>
  )
}
