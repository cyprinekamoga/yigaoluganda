import { diffDays } from './dates';

/** Gamification rules (PRD §6). */
export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 20 * 60 * 1000;
export const REFILL_COST = 30;

export const LESSON_XP = 10;
export const PERFECT_XP = 5;
export const LESSON_GEMS = 5;
export const PERFECT_GEMS = 5;
export const PRACTICE_XP = 5;
export const PRACTICE_GEMS = 2;

export interface Stats {
  xp: number;
  gems: number;
  hearts: number;
  /** When the next heart started counting (ms). */
  heartsAt: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: string | null;
  xpByDay: Record<string, number>;
  perfectLessons: number;
  dialoguesDone: number;
  recordings: number;
}

export function initialStats(now: number): Stats {
  return {
    xp: 0,
    gems: 0,
    hearts: MAX_HEARTS,
    heartsAt: now,
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    xpByDay: {},
    perfectLessons: 0,
    dialoguesDone: 0,
    recordings: 0,
  };
}

/** Add the hearts that have grown back since heartsAt. */
export function regenHearts(s: Stats, now: number): Stats {
  if (s.hearts >= MAX_HEARTS) return s.heartsAt === now ? s : { ...s, heartsAt: now };
  const gained = Math.floor((now - s.heartsAt) / HEART_REGEN_MS);
  if (gained <= 0) return s;
  const hearts = Math.min(MAX_HEARTS, s.hearts + gained);
  return { ...s, hearts, heartsAt: hearts >= MAX_HEARTS ? now : s.heartsAt + gained * HEART_REGEN_MS };
}

export function loseHeart(s: Stats, now: number): Stats {
  const r = regenHearts(s, now);
  if (r.hearts <= 0) return r;
  return { ...r, hearts: r.hearts - 1, heartsAt: r.hearts >= MAX_HEARTS ? now : r.heartsAt };
}

/** Milliseconds until the next heart, or 0 when full. */
export function nextHeartIn(s: Stats, now: number): number {
  const r = regenHearts(s, now);
  if (r.hearts >= MAX_HEARTS) return 0;
  return Math.max(0, r.heartsAt + HEART_REGEN_MS - now);
}

export function refillHearts(s: Stats, now: number): Stats {
  return { ...s, hearts: MAX_HEARTS, heartsAt: now };
}

export function buyRefill(s: Stats, now: number): Stats | null {
  if (s.gems < REFILL_COST) return null;
  return { ...refillHearts(s, now), gems: s.gems - REFILL_COST };
}

export function lessonReward(perfect: boolean): { xp: number; gems: number } {
  return { xp: LESSON_XP + (perfect ? PERFECT_XP : 0), gems: LESSON_GEMS + (perfect ? PERFECT_GEMS : 0) };
}

/** Record an activity on `today`: adds XP and gems and moves the streak. */
export function recordActivity(s: Stats, today: string, xp: number, gems: number): Stats {
  let streak = s.streak;
  if (s.lastActiveDay !== today) {
    const gap = s.lastActiveDay ? diffDays(s.lastActiveDay, today) : Infinity;
    streak = gap === 1 ? s.streak + 1 : 1;
  }
  return {
    ...s,
    xp: s.xp + xp,
    gems: s.gems + gems,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    lastActiveDay: today,
    xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
  };
}

/** The streak to show: it stays alive until a full day is missed. */
export function visibleStreak(s: Stats, today: string): number {
  if (!s.lastActiveDay) return 0;
  return diffDays(s.lastActiveDay, today) <= 1 ? s.streak : 0;
}

export function activeToday(s: Stats, today: string): boolean {
  return s.lastActiveDay === today;
}
