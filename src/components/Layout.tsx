import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../state/AppState'
import { StatChips } from './StatChips'

const TABS = [
  { to: '/', key: 'nav.learn', icon: '🗺️', end: true },
  { to: '/practice', key: 'nav.practice', icon: '💪🏾' },
  { to: '/stories', key: 'nav.stories', icon: '📖' },
  { to: '/badges', key: 'nav.badges', icon: '🏅' },
  { to: '/settings', key: 'nav.settings', icon: '⚙️' },
]

/** Main screens: stats on top, big tab bar at the bottom. */
export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  const { t } = useApp()
  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b-2 border-line bg-mist/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-2">
          <span className="font-display text-xl font-bold text-lake">{title ?? t('app.name')}</span>
          <StatChips />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-4">{children}</main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-cloud pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-xs font-bold sm:text-sm ${isActive ? 'bg-lake-soft text-lake-dark' : 'text-ink-soft'}`
                }
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {tab.icon}
                </span>
                {t(tab.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
