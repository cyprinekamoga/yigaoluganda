import { getCapability, viewerId, type DocRef } from '../platform/claude'
import type { ProgressState } from '../logic/progress'
import { revive } from './storage'

/**
 * Online saving, for when the app runs as a shared Claude artifact.
 * Each person's progress lives in their own private document (only they can read it),
 * and a small public row (nickname, wins, XP) feeds the family leaderboard.
 */
export interface Cloud {
  /** The signed-in person's progress from another device, if any. */
  remote: ProgressState | null
  save: (state: ProgressState) => Promise<boolean>
}

export const LEADERBOARD = 'players'

export async function connectCloud(): Promise<Cloud | null> {
  const [db, id] = await Promise.all([getCapability('db'), viewerId()])
  if (!db || !id) return null
  let progressRef: DocRef
  let playerRef: DocRef
  try {
    progressRef = db.doc(`data/users/${id}/progress`)
    playerRef = db.collection(LEADERBOARD).doc(id)
  } catch {
    return null
  }
  let remote: ProgressState | null = null
  try {
    const snap = await progressRef.get()
    const raw = snap.exists ? snap.data()?.json : undefined
    if (typeof raw === 'string') {
      remote = revive(JSON.parse(raw) as ProgressState, Date.now())
    }
  } catch {
    // Can't read: carry on with this device's progress.
  }

  let lastProgress = ''
  let lastPlayer = ''
  const save = async (state: ProgressState) => {
    try {
      const json = JSON.stringify(state)
      if (json !== lastProgress) {
        await progressRef.set({ json, xp: state.xp, updatedAt: Date.now() })
        lastProgress = json
      }
      const nick = state.settings.nickname.trim()
      if (nick) {
        const row = { nick, avatar: state.settings.avatar, xp: state.xp, wins: state.duelWins, played: state.duelsPlayed }
        const key = JSON.stringify(row)
        if (key !== lastPlayer) {
          await playerRef.set({ ...row, updatedAt: Date.now() })
          lastPlayer = key
        }
      }
      return true
    } catch {
      return false
    }
  }
  return { remote, save }
}

/** Use the online copy when it has more progress than this device (e.g. a new tablet). */
export function preferRemote(local: ProgressState, remote: ProgressState | null): boolean {
  if (!remote?.settings?.onboarded) return false
  if (!local.settings.onboarded) return true
  return remote.xp > local.xp
}
