import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Lang } from '../content/types'
import { makeT, translateList, type TFunction } from '../i18n'
import { awardBadges } from '../logic/badges'
import { currentHearts, initialState, type ProgressState } from '../logic/progress'
import { clearState, loadState, saveState } from './storage'

interface AppContextValue {
  state: ProgressState
  /** Hearts right now, including any that refilled since last time. */
  hearts: number
  /** Apply a change. Returns any badges that were earned by it. */
  update: (fn: (s: ProgressState, now: number) => ProgressState) => string[]
  reset: () => void
  t: TFunction
  tList: (key: string) => string[]
  ui: Lang
  track: Lang
  now: number
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadState(Date.now()))
  const [now, setNow] = useState(() => Date.now())
  // The latest state, so several updates in one click build on each other and badges are known at once.
  const latest = useRef(state)

  // Tick once a minute so refilled hearts and the streak stay up to date.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    document.documentElement.lang = state.settings.uiLang
  }, [state.settings.uiLang])

  const update = useCallback((fn: (s: ProgressState, now: number) => ProgressState) => {
    const t = Date.now()
    const result = awardBadges(fn(latest.current, t), t)
    latest.current = result.state
    setState(result.state)
    setNow(t)
    return result.earned
  }, [])

  const reset = useCallback(() => {
    clearState()
    const fresh = initialState(Date.now(), latest.current.settings.uiLang)
    latest.current = fresh
    setState(fresh)
  }, [])

  const value = useMemo<AppContextValue>(() => {
    const ui = state.settings.uiLang
    return {
      state,
      hearts: currentHearts(state, now).hearts,
      update,
      reset,
      t: makeT(ui),
      tList: (key) => translateList(ui, key),
      ui,
      track: state.settings.track,
      now,
    }
  }, [state, now, update, reset])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider')
  return ctx
}
