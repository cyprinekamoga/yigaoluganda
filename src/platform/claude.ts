/**
 * Access to the claude.ai artifact runtime (shared database, live rooms, who is viewing).
 * These only exist when the app is opened as a published Claude artifact. Everywhere else
 * (local dev, a static host) every capability resolves to null and the app works offline as before.
 */

/* Minimal typings for the parts of the runtime this app uses. */
export interface DocSnap {
  exists: boolean
  data(): Record<string, unknown> | undefined
  id: string
}
export interface DocRef {
  get(): Promise<DocSnap>
  set(data: Record<string, unknown>): Promise<void>
}
export interface QuerySnap {
  docs: DocSnap[]
}
export interface Query {
  orderBy(field: string, dir?: 'asc' | 'desc'): Query
  limit(n: number): Query
  get(): Promise<QuerySnap>
  onSnapshot(next: (s: QuerySnap) => void, error?: (e: { code: string }) => void): () => void
}
export interface CollectionRef extends Query {
  doc(id: string): DocRef
}
export interface Db {
  doc(path: string): DocRef
  collection(path: string): CollectionRef
}
export interface UserCap {
  id(): Promise<string | null>
}
export interface Peer {
  peer: string
  by: string | null
  isMe: boolean
  sameTab: boolean
  kind: 'viewer' | 'agent'
  presence: Readonly<Record<string, unknown>>
  updatedAt: number
}
export interface PeersChange {
  peers: readonly Peer[]
}
export interface RoomLike {
  presence(patch: Record<string, unknown>): Promise<void>
  peers(): readonly Peer[]
  onPeers(handler: (c: PeersChange) => void, onError?: (e: { code: string }) => void): () => void
}
export interface NamedRoom extends RoomLike {
  readonly name: string
  leave(): Promise<void>
}
export interface Room extends RoomLike {
  join(name: string): Promise<NamedRoom>
  connected(): boolean
}

interface CapMap {
  db: Db
  user: UserCap
  room: Room
}

type ClaudeGlobal = { use?: (name: string) => Promise<unknown> }

const cache = new Map<string, Promise<unknown>>()
let runtimePromise: Promise<ClaudeGlobal | null> | null = null

/** The runtime object, waiting a moment in case it is attached just after the page starts. */
function runtime(): Promise<ClaudeGlobal | null> {
  runtimePromise ??= new Promise((resolve) => {
    const get = () => (globalThis as { claude?: ClaudeGlobal }).claude ?? null
    if (get()) return resolve(get())
    let tries = 0
    const id = setInterval(() => {
      if (get() || ++tries > 20) {
        clearInterval(id)
        resolve(get())
      }
    }, 100)
  })
  return runtimePromise
}

/** Resolves the capability, or null when this view can't run it. Never rejects. */
export function getCapability<K extends keyof CapMap>(name: K): Promise<CapMap[K] | null> {
  if (!cache.has(name)) {
    const p = runtime().then((claude) => (claude?.use ? claude.use(name).catch(() => null) : null))
    cache.set(name, p)
  }
  return cache.get(name) as Promise<CapMap[K] | null>
}

/** The signed-in viewer's id (stable per person for this app), or null. */
export async function viewerId(): Promise<string | null> {
  const user = await getCapability('user')
  if (!user) return null
  try {
    return await user.id()
  } catch {
    return null
  }
}
