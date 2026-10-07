import { initialState, type ProgressState } from '../logic/progress'

export const STORAGE_KEY = 'yiga-oluganda:v1'

/** Reads saved progress. Falls back to a fresh start if storage is blocked or the data is broken. */
export function loadState(now: number): ProgressState {
  const fresh = initialState(now, guessLang())
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh
    return revive(JSON.parse(raw) as Partial<ProgressState>, now) ?? fresh
  } catch {
    return fresh
  }
}

/** Fills in anything an older saved copy is missing. Null if the data isn't usable. */
export function revive(saved: Partial<ProgressState> | null | undefined, now: number): ProgressState | null {
  if (!saved || saved.version !== 1) return null
  const fresh = initialState(now, saved.settings?.uiLang ?? guessLang())
  return { ...fresh, ...saved, settings: { ...fresh.settings, ...saved.settings } }
}

export function saveState(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode or storage full: the app still works, progress just isn't kept.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function guessLang() {
  try {
    return navigator.language?.toLowerCase().startsWith('sv') ? 'sv' : 'en'
  } catch {
    return 'sv'
  }
}
