import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Confetti } from '../components/Confetti'
import { Layout } from '../components/Layout'
import { Mascot } from '../components/Mascot'
import { playCorrect, playFanfare, playGentle } from '../components/sound'
import { ExerciseView } from '../exercises/ExerciseView'
import type { ExerciseResult } from '../exercises/types'
import { BADGES } from '../logic/badges'
import {
  cleanWordIds,
  duelLevel,
  duelOutcome,
  duelPoints,
  generateDuel,
  newDuelId,
  pickDuelWords,
} from '../logic/duel'
import { completeDuel, recordAnswer, XP, type DuelOutcome } from '../logic/progress'
import { getCapability, viewerId, type NamedRoom, type Peer, type Room } from '../platform/claude'
import { LEADERBOARD } from '../state/cloud'
import { useApp } from '../state/AppState'

/** Animals to pick from. Nicknames and animals are what family members see of each other. */
const AVATARS = ['🦁', '🐘', '🦒', '🦓', '🐆', '🦏', '🐒', '🦜', '🐊', '🦩', '🐢', '🐝']

interface Player {
  peer: string
  nick: string
  avatar: string
}
interface DuelInfo {
  id: string
  seed: number
  words: string[]
  opponent: Player
}

// ---------- reading what other devices share (always untrusted) ----------

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function playerOf(p: Peer): Player | null {
  const nick = str(p.presence.nick, 16)
  if (p.kind !== 'viewer' || p.presence.app !== 'yiga' || !nick) return null
  return { peer: p.peer, nick, avatar: AVATARS.includes(str(p.presence.avatar, 8)) ? str(p.presence.avatar, 8) : '🙂' }
}

/** Keeps a list of everyone in a room up to date. */
function usePeers(room: { peers(): readonly Peer[]; onPeers: Room['onPeers'] } | null): readonly Peer[] {
  const [peers, setPeers] = useState<readonly Peer[]>(() => room?.peers() ?? [])
  useEffect(() => {
    if (!room) return
    setPeers(room.peers())
    return room.onPeers((c) => setPeers(c.peers))
  }, [room])
  return peers
}

// ---------- screen ----------

export function DuelScreen() {
  const { t, state } = useApp()
  const [room, setRoom] = useState<Room | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [duel, setDuel] = useState<DuelInfo | null>(null)

  useEffect(() => {
    let live = true
    getCapability('room').then((r) => live && setRoom(r))
    return () => {
      live = false
    }
  }, [])
  // Leaving the Duel tab takes you off everyone's list.
  useEffect(() => {
    if (!room) return
    return () => void room.presence({ status: null, invite: null, accept: null, decline: null }).catch(() => undefined)
  }, [room])

  if (duel && room) return <DuelMatch room={room} duel={duel} onDone={() => setDuel(null)} />

  const needsProfile = !state.settings.nickname || editing
  return (
    <Layout title={t('duel.title')}>
      <div className="mb-6 flex items-center gap-3 rounded-3xl bg-cloud p-4 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
        <Mascot size={70} mood="cheer" label={t('a11y.mascot', { mascot: state.settings.mascotName })} />
        <p className="text-lg">{t('duel.intro')}</p>
      </div>
      {room === undefined ? (
        <p className="text-center text-lg text-ink-soft">{t('common.loading')}</p>
      ) : room === null ? (
        <p className="rounded-3xl border-2 border-sun bg-sun-soft p-4 text-lg" data-testid="duel-unavailable">
          {t('duel.unavailable')}
        </p>
      ) : needsProfile ? (
        <DuelProfile onDone={() => setEditing(false)} />
      ) : (
        <Lobby room={room} onEdit={() => setEditing(true)} onStart={setDuel} />
      )}
      <Leaderboard />
    </Layout>
  )
}

function DuelProfile({ onDone }: { onDone: () => void }) {
  const { t, state, update } = useApp()
  const [nick, setNick] = useState(state.settings.nickname)
  const [avatar, setAvatar] = useState(state.settings.avatar || AVATARS[0])
  const save = () => {
    const nickname = nick.trim().slice(0, 16)
    if (!nickname) return
    update((s) => ({ ...s, settings: { ...s.settings, nickname, avatar } }))
    onDone()
  }
  return (
    <section className="mb-8 rounded-3xl bg-cloud p-5 shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]" data-testid="duel-profile">
      <h2 className="mb-3 font-display text-2xl font-semibold">{t('duel.setupTitle')}</h2>
      <label className="block font-bold" htmlFor="duel-nick">
        {t('duel.nickLabel')}
      </label>
      <input
        id="duel-nick"
        value={nick}
        maxLength={16}
        autoComplete="off"
        onChange={(e) => setNick(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="mt-1 w-full rounded-2xl border-[3px] border-line bg-white px-4 py-3 text-xl"
      />
      <p className="mt-1 text-ink-soft">{t('duel.nickHint')}</p>
      <p className="mt-4 font-bold">{t('duel.pickAvatar')}</p>
      <div role="radiogroup" aria-label={t('duel.pickAvatar')} className="mt-2 grid grid-cols-6 gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={avatar === a}
            onClick={() => setAvatar(a)}
            className={`grid h-14 place-items-center rounded-2xl border-[3px] text-3xl ${avatar === a ? 'border-lake bg-lake-soft' : 'border-line bg-cloud'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <Button className="mt-5" block variant="success" disabled={!nick.trim()} onClick={save} data-testid="duel-save">
        {t('duel.save')}
      </Button>
    </section>
  )
}

// ---------- lobby: who is here, challenges ----------

interface Invite {
  id: string
  to: string
  seed: number
  words: string[]
}

function Lobby({ room, onEdit, onStart }: { room: Room; onEdit: () => void; onStart: (d: DuelInfo) => void }) {
  const { t, state } = useApp()
  const peers = usePeers(room)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [accepted, setAccepted] = useState<string | null>(null)
  const [declinedIds, setDeclinedIds] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const me = peers.find((p) => p.sameTab)
  const { nickname, avatar } = state.settings
  const level = duelLevel(state)

  // Tell everyone here who we are and what we're doing. Cleared again when leaving the lobby.
  useEffect(() => {
    room
      .presence({
        app: 'yiga',
        nick: nickname,
        avatar,
        level,
        status: 'lobby',
        invite: invite ? { ...invite } : null,
        accept: accepted,
        decline: declinedIds.at(-1) ?? null,
      })
      .catch(() => undefined)
  }, [room, nickname, avatar, level, invite, accepted, declinedIds])

  const others = peers
    .filter((p) => !p.sameTab)
    .map((p) => ({ p, player: playerOf(p) }))
    .filter((x): x is { p: Peer; player: Player } => x.player !== null && x.p.presence.status === 'lobby')

  // Someone challenging me.
  const incoming = others.find(({ p }) => {
    const inv = obj(p.presence.invite)
    return me && inv.to === me.peer && typeof inv.id === 'string' && !declinedIds.includes(inv.id)
  })

  // My challenge: did they answer? (They may already show as busy, having just accepted.)
  const targetPeer = invite ? peers.find((p) => p.peer === invite.to) : undefined
  const targetPlayer = targetPeer ? playerOf(targetPeer) : null
  const target = targetPeer && targetPlayer ? { p: targetPeer, player: targetPlayer } : undefined
  useEffect(() => {
    if (!invite) return
    if (!target) {
      setInvite(null)
      return
    }
    if (target.p.presence.accept === invite.id) {
      setInvite(null)
      onStart({ id: invite.id, seed: invite.seed, words: invite.words, opponent: target.player })
    } else if (target.p.presence.decline === invite.id) {
      setInvite(null)
      setNotice(t('duel.declined', { name: target.player.nick }))
    }
  }, [invite, target, onStart, t])

  const challenge = (p: Peer) => {
    const seed = Math.floor(Math.random() * 2 ** 31)
    setNotice('')
    setInvite({ id: newDuelId(), to: p.peer, seed, words: pickDuelWords(level, num(p.presence.level), seed) })
  }

  const accept = () => {
    if (!incoming) return
    const inv = obj(incoming.p.presence.invite)
    const words = cleanWordIds(inv.words)
    const id = str(inv.id, 12).replace(/[^a-z0-9]/g, '')
    if (words.length < 4 || !id) return
    setAccepted(id)
    // Sent right away: this screen closes as the duel starts.
    room.presence({ accept: id, status: 'busy', invite: null }).catch(() => undefined)
    onStart({ id, seed: num(inv.seed), words, opponent: incoming.player })
  }
  const decline = () => incoming && setDeclinedIds((d) => [...d, str(obj(incoming.p.presence.invite).id, 12)])

  return (
    <section className="mb-8" data-testid="duel-lobby">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-cloud p-3">
        <span className="flex items-center gap-2 text-xl font-bold">
          <span aria-hidden="true" className="text-3xl">{avatar}</span>
          {nickname} <span className="text-ink-soft">({t('duel.you')})</span>
        </span>
        <button type="button" onClick={onEdit} className="rounded-xl px-3 py-2 font-bold text-lake-dark">
          {t('duel.edit')}
        </button>
      </div>

      {incoming && (
        <div role="alertdialog" aria-labelledby="duel-invite" className="mb-4 rounded-3xl border-4 border-sun bg-sun-soft p-4 text-center" data-testid="duel-invite">
          <p id="duel-invite" className="font-display text-2xl font-semibold">
            <span aria-hidden="true">{incoming.player.avatar} </span>
            {t('duel.invited', { name: incoming.player.nick })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="success" onClick={accept} data-testid="duel-accept">
              {t('duel.accept')}
            </Button>
            <Button variant="ghost" onClick={decline}>
              {t('duel.decline')}
            </Button>
          </div>
        </div>
      )}

      {notice && <p className="mb-4 rounded-2xl bg-lake-soft p-3 font-bold text-lake-dark">{notice}</p>}

      <h2 className="mb-2 font-display text-2xl font-semibold">{t('duel.online')}</h2>
      {others.length === 0 ? (
        <p className="rounded-2xl bg-cloud p-4 text-lg text-ink-soft">{t('duel.nobody')}</p>
      ) : (
        <ul className="grid gap-3">
          {others.map(({ p, player }) => {
            const waiting = invite?.to === p.peer
            return (
              <li key={p.peer} className="flex items-center justify-between gap-3 rounded-2xl bg-cloud p-3 shadow-[0_6px_16px_-12px_rgba(43,29,20,0.4)]">
                <span className="flex items-center gap-2 text-xl font-bold">
                  <span aria-hidden="true" className="text-3xl">{player.avatar}</span>
                  {player.nick}
                </span>
                {waiting ? (
                  <Button variant="ghost" onClick={() => setInvite(null)}>
                    {t('common.cancel')}
                  </Button>
                ) : (
                  <Button variant="primary" disabled={Boolean(invite)} onClick={() => challenge(p)} data-testid="duel-challenge">
                    ⚔️ {t('duel.challenge')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {invite && target && <p className="mt-3 text-center text-lg font-bold text-lake-dark">{t('duel.waiting', { name: target.player.nick })}</p>}
    </section>
  )
}

// ---------- the match ----------

type Stage = 'waiting' | 'countdown' | 'play' | 'finished' | 'result'
const NO_SHOW_MS = 20_000
const WAIT_FINISH_MS = 60_000
const LEFT_GRACE_MS = 6_000

function DuelMatch({ room, duel, onDone }: { room: Room; duel: DuelInfo; onDone: () => void }) {
  const { t, state, track, update } = useApp()
  const exercises = useMemo(() => generateDuel(duel.words, duel.seed), [duel])
  const total = exercises.length
  const [match, setMatch] = useState<NamedRoom | null>(null)
  const [stage, setStage] = useState<Stage>('waiting')
  const [count, setCount] = useState(3)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [right, setRight] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number; solution: string } | null>(null)
  const [noShow, setNoShow] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const [result, setResult] = useState<{ outcome: DuelOutcome; xp: number; badges: string[] } | null>(null)
  const askedAt = useRef(0)
  const lastSeen = useRef(Date.now())
  const seenOpponent = useRef(false)

  // Each duel has its own small room, so the two players only hear each other.
  useEffect(() => {
    let live = true
    let joined: NamedRoom | null = null
    room
      .join(`duel-${duel.id}`)
      .then((r) => {
        joined = r
        if (live) setMatch(r)
        else void r.leave()
      })
      .catch(() => live && setNoShow(true))
    return () => {
      live = false
      void joined?.leave().catch(() => undefined)
    }
  }, [room, duel.id])

  // Leave the lobby list while dueling.
  useEffect(() => void room.presence({ status: 'busy', invite: null }).catch(() => undefined), [room])

  const peers = usePeers(match)
  const oppPeer = peers.find((p) => !p.sameTab && p.kind === 'viewer')
  const opp = {
    i: Math.min(total, num(oppPeer?.presence.i)),
    score: num(oppPeer?.presence.score),
    done: oppPeer?.presence.done === true,
  }
  const [oppFinal, setOppFinal] = useState(opp)
  useEffect(() => {
    if (oppPeer) {
      seenOpponent.current = true
      lastSeen.current = Date.now()
      setOppFinal({ i: opp.i, score: opp.score, done: opp.done })
    }
  }, [oppPeer, opp.i, opp.score, opp.done])

  const done = stage === 'finished' || stage === 'result'
  useEffect(() => {
    match?.presence({ nick: state.settings.nickname, avatar: state.settings.avatar, i: index, score, done }).catch(() => undefined)
  }, [match, index, score, done, state.settings.nickname, state.settings.avatar])

  // Waiting for the opponent, then 3-2-1.
  useEffect(() => {
    if (stage !== 'waiting') return
    if (oppPeer) {
      setStage('countdown')
      return
    }
    const id = setTimeout(() => setNoShow(true), NO_SHOW_MS)
    return () => clearTimeout(id)
  }, [stage, oppPeer])
  useEffect(() => {
    if (stage !== 'countdown') return
    if (count <= 0) {
      askedAt.current = Date.now()
      setStage('play')
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 800)
    return () => clearTimeout(id)
  }, [stage, count])

  // The opponent closing the app (with a little grace for a flaky connection).
  useEffect(() => {
    if (stage === 'waiting' || stage === 'result' || oppPeer || !seenOpponent.current) return
    const id = setTimeout(() => setOpponentLeft(true), Math.max(0, LEFT_GRACE_MS - (Date.now() - lastSeen.current)))
    return () => clearTimeout(id)
  }, [stage, oppPeer])

  // Finish when both are done, the opponent left, or they take far too long.
  useEffect(() => {
    if (stage !== 'finished') return
    if (oppFinal.done || opponentLeft) {
      setStage('result')
      return
    }
    const id = setTimeout(() => setStage('result'), WAIT_FINISH_MS)
    return () => clearTimeout(id)
  }, [stage, oppFinal.done, opponentLeft])

  useEffect(() => {
    if (stage !== 'result' || result) return
    const outcome = duelOutcome(score, oppFinal.score)
    const badges = update((s) => completeDuel(s, outcome, new Date()))
    const xp = outcome === 'win' ? XP.duelWin : outcome === 'draw' ? XP.duelDraw : XP.duelPlayed
    setResult({ outcome, xp, badges })
    if (state.settings.sound && outcome !== 'loss') playFanfare()
  }, [stage, result, score, oppFinal.score, update, state.settings.sound])

  const exercise = exercises[index]
  const answer = (r: ExerciseResult | null) => {
    if (!r || feedback || stage !== 'play' || !exercise) return
    const points = duelPoints(r.correct, Date.now() - askedAt.current)
    setFeedback({ correct: r.correct, points, solution: r.solution })
    setScore((s) => s + points)
    if (r.correct) setRight((n) => n + 1)
    update((s, now) => recordAnswer(s, exercise.wordIds, r.correct, now))
    if (state.settings.sound) (r.correct ? playCorrect : playGentle)()
  }
  useEffect(() => {
    if (!feedback) return
    const id = setTimeout(() => {
      setFeedback(null)
      askedAt.current = Date.now()
      if (index + 1 >= total) setStage('finished')
      setIndex((i) => Math.min(total, i + 1))
    }, feedback.correct ? 900 : 1600)
    return () => clearTimeout(id)
  }, [feedback, index, total])

  const opponent = duel.opponent

  if (noShow && stage === 'waiting')
    return (
      <Layout title={t('duel.title')}>
        <div className="flex flex-col items-center rounded-3xl bg-cloud p-6 text-center">
          <Mascot mood="gentle" size={100} />
          <p className="mt-3 text-xl font-bold">{t('duel.noShow', { name: opponent.nick })}</p>
          <Button className="mt-5" block onClick={onDone}>
            {t('duel.again')}
          </Button>
        </div>
      </Layout>
    )

  if (stage === 'result' && result) {
    const title = result.outcome === 'win' ? t('duel.youWin') : result.outcome === 'draw' ? t('duel.draw') : t('duel.youLose', { name: opponent.nick })
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center px-4 py-10 text-center" data-testid="duel-result">
        {result.outcome === 'win' && <Confetti />}
        <Mascot mood={result.outcome === 'loss' ? 'gentle' : 'cheer'} size={130} />
        <h1 className="mt-4 font-display text-4xl font-bold text-lake-dark">{title}</h1>
        {opponentLeft && !oppFinal.done && <p className="mt-2 text-lg text-ink-soft">{t('duel.opponentLeft', { name: opponent.nick })}</p>}
        <div className="mt-6 grid w-full grid-cols-2 gap-3">
          <ScoreCard avatar={state.settings.avatar} nick={`${state.settings.nickname} (${t('duel.you')})`} score={score} highlight={result.outcome !== 'loss'} />
          <ScoreCard avatar={opponent.avatar} nick={opponent.nick} score={oppFinal.score} highlight={result.outcome !== 'win'} />
        </div>
        <p className="mt-4 text-lg">{t('duel.correct', { n: right, total })}</p>
        <p className="mt-2 font-display text-2xl font-semibold text-leaf-dark">🐚 {t('duel.xpEarned', { n: result.xp })}</p>
        {result.badges.map((id) => {
          const b = BADGES.find((x) => x.id === id)
          return (
            <p key={id} className="mt-3 rounded-2xl bg-sun-soft px-4 py-2 font-bold">
              {b?.emoji} {t(`badges.${id}.title`)}
            </p>
          )
        })}
        <Button className="mt-8" block variant="success" onClick={onDone} data-testid="duel-done">
          {t('duel.again')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-10 pt-4" data-testid="duel-match">
      <div className="mb-5 grid grid-cols-2 gap-3">
        <RaceLane avatar={state.settings.avatar} nick={state.settings.nickname} score={score} progress={Math.min(index, total) / total} />
        <RaceLane avatar={opponent.avatar} nick={opponent.nick} score={oppFinal.score} progress={oppFinal.i / total} />
      </div>

      {(stage === 'waiting' || stage === 'countdown') && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-display text-3xl font-semibold">
            {state.settings.avatar} {t('duel.vs')} {opponent.avatar}
          </p>
          <p className="mt-4 text-xl font-bold text-lake-dark">{t('duel.getReady')}</p>
          {stage === 'countdown' && count > 0 && (
            <p className="mt-4 font-display text-4xl font-bold text-crane" aria-live="assertive" style={{ fontSize: '6rem', lineHeight: 1 }}>
              {count}
            </p>
          )}
        </div>
      )}

      {stage === 'play' && exercise && (
        <>
          <p className="mb-2 font-bold text-ink-soft">{t('duel.question', { n: index + 1, total })}</p>
          <main key={exercise.id} className="flex-1" data-testid="exercise" data-kind={exercise.kind}>
            <ExerciseView exercise={exercise} lang={track} checked={feedback !== null} setPending={answer} submit={answer} />
          </main>
          {feedback && (
            <p
              role="status"
              className={`mt-4 rounded-2xl p-4 text-center font-display text-2xl font-semibold ${feedback.correct ? 'bg-leaf-soft text-leaf-dark' : 'bg-crane-soft text-crane'}`}
            >
              {feedback.correct ? `✓ +${feedback.points}` : `✗ ${feedback.solution}`}
            </p>
          )}
        </>
      )}

      {stage === 'finished' && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="think" size={110} />
          <p className="mt-3 text-xl font-bold">{t('duel.waitOpponent', { name: opponent.nick })}</p>
        </div>
      )}
    </div>
  )
}

function RaceLane({ avatar, nick, score, progress }: { avatar: string; nick: string; score: number; progress: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100)
  return (
    <div className="rounded-2xl bg-cloud p-3 shadow-[0_6px_16px_-12px_rgba(43,29,20,0.4)]">
      <p className="flex items-center justify-between gap-1 font-bold">
        <span className="truncate">
          <span aria-hidden="true">{avatar} </span>
          {nick}
        </span>
        <span className="text-lake-dark">{score}</span>
      </p>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full rounded-full bg-leaf transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ScoreCard({ avatar, nick, score, highlight }: { avatar: string; nick: string; score: number; highlight: boolean }) {
  const { t } = useApp()
  return (
    <div className={`rounded-3xl border-4 p-4 ${highlight ? 'border-sun bg-sun-soft' : 'border-line bg-cloud'}`}>
      <p className="text-4xl" aria-hidden="true">
        {avatar}
      </p>
      <p className="truncate font-bold">{nick}</p>
      <p className="font-display text-2xl font-semibold">{t('duel.points', { n: score })}</p>
    </div>
  )
}

// ---------- leaderboard ----------

interface Row {
  id: string
  nick: string
  avatar: string
  wins: number
  played: number
  xp: number
}

function Leaderboard() {
  const { t } = useApp()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let live = true
    Promise.all([getCapability('db'), viewerId()]).then(([db, id]) => {
      if (!live || !db) return
      setMe(id)
      try {
        unsub = db.collection(LEADERBOARD).onSnapshot(
          (snap) =>
            setRows(
              snap.docs
                .map((d) => {
                  const v = obj(d.data())
                  return { id: d.id, nick: str(v.nick, 16), avatar: str(v.avatar, 8), wins: num(v.wins), played: num(v.played), xp: num(v.xp) }
                })
                .filter((r) => r.nick && r.played > 0)
                .sort((a, b) => b.wins - a.wins || b.xp - a.xp)
                .slice(0, 20),
            ),
          () => setRows(null),
        )
      } catch {
        /* no leaderboard */
      }
    })
    return () => {
      live = false
      unsub?.()
    }
  }, [])

  if (!rows) return null
  return (
    <section className="mb-8" data-testid="leaderboard">
      <h2 className="mb-2 font-display text-2xl font-semibold">🏆 {t('duel.leaderboard')}</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-cloud p-4 text-lg text-ink-soft">{t('duel.noBoard')}</p>
      ) : (
        <ol className="grid gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl p-3 ${r.id === me ? 'bg-lake-soft' : 'bg-cloud'}`}>
              <span className="w-8 text-center font-display text-xl font-semibold">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <span aria-hidden="true" className="text-2xl">
                {AVATARS.includes(r.avatar) ? r.avatar : '🙂'}
              </span>
              <span className="flex-1 truncate text-lg font-bold">
                {r.nick}
                {r.id === me && <span className="text-ink-soft"> ({t('duel.you')})</span>}
              </span>
              <span className="text-right font-bold">
                {t('duel.wins', { n: r.wins })}
                <span className="block text-sm text-ink-soft">🐚 {r.xp}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

