import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CHAPTERS, LESSONS, type Lang } from '../content';
import { newlyEarned } from '../logic/badges';
import { dayKey } from '../logic/dates';
import {
  buyRefill as buyRefillRule,
  initialStats,
  lessonReward,
  loseHeart as loseHeartRule,
  PRACTICE_GEMS,
  recordActivity,
  refillHearts,
  regenHearts,
  type Stats,
} from '../logic/progress';
import { DEFAULT_REMINDER_HOUR } from '../logic/reminders';
import { grade, introduce, type SrsCard } from '../logic/srs';

export interface Profile {
  name: string;
  lang: Lang;
  createdAt: number;
}

export interface Settings {
  sfx: boolean;
  haptics: boolean;
  /** Daily reminder: a notification on phones, an e-mail on the web (with an account). */
  reminder: { on: boolean; hour: number };
  /** The "want a daily reminder?" offer has been answered. */
  reminderAsked: boolean;
}

export interface LessonRecord {
  completedAt: number;
  bestAccuracy: number;
  plays: number;
  /** Marked done by the placement test rather than played. */
  placed?: true;
}

export interface LessonResult {
  lessonId: string;
  graded: number;
  mistakes: number;
}

export interface Reward {
  /** Cowries earned. */
  gems: number;
  perfect: boolean;
  badges: string[];
  heartsRefilled?: boolean;
}

export interface Data {
  profile: Profile | null;
  settings: Settings;
  stats: Stats;
  done: Record<string, LessonRecord>;
  opened: Record<string, true>;
  lastChapterId: string | null;
  srs: Record<string, SrsCard>;
  badges: Record<string, number>;
  /** Position in the fun-fact rotation. */
  factIndex: number;
  /** The placement test has been taken or declined (hides the offer on the home screen). */
  placementSeen: boolean;
  /** Certificates issued for finished parts, by part number. */
  certs: Record<string, IssuedCert>;
}

/** A certificate the account's server issued (the code is what makes it checkable). */
export interface IssuedCert {
  code: string;
  /** The name printed on it. */
  name: string;
  issuedAt: number;
  phrases: number;
}

interface Actions {
  start(name: string, lang: Lang): void;
  setLang(lang: Lang): void;
  setName(name: string): void;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
  tick(): void;
  openChapter(id: string): void;
  meet(phraseIds: string[]): void;
  gradePhrases(phraseIds: string[], correct: boolean): void;
  loseHeart(): void;
  completeLesson(result: LessonResult): Reward;
  completePractice(kind: 'review' | 'dialogue' | 'speak'): Reward;
  buyRefill(): boolean;
  noteRecording(): void;
  /** The next fun fact to show (index into FACTS); advances the rotation. */
  takeFact(count: number): number;
  /** Marks whole chapters as done after the placement test, and adds their phrases to review. */
  placeOut(chapterIds: string[]): void;
  setPlacementSeen(): void;
  saveCert(part: number, cert: IssuedCert): void;
  reset(): void;
}

export type AppState = Data & Actions;

const fresh = (): Data => ({
  profile: null,
  settings: { sfx: true, haptics: true, reminder: { on: false, hour: DEFAULT_REMINDER_HOUR }, reminderAsked: false },
  stats: initialStats(Date.now()),
  done: {},
  opened: {},
  lastChapterId: null,
  srs: {},
  badges: {},
  factIndex: 0,
  placementSeen: false,
  certs: {},
});

export const STORE_KEY = 'yiga-oluganda-v2';

/** The saved part of the state: what goes to the device and, with an account, to the cloud. */
export function snapshot(s: Data): Data {
  return {
    profile: s.profile,
    settings: s.settings,
    stats: s.stats,
    done: s.done,
    opened: s.opened,
    lastChapterId: s.lastChapterId,
    srs: s.srs,
    badges: s.badges,
    factIndex: s.factIndex,
    placementSeen: s.placementSeen,
    certs: s.certs,
  };
}

/** Fills any field a saved snapshot lacks, so an older or partial copy loads safely. */
export function restore(saved: Partial<Data>): Data {
  const base = fresh();
  return { ...base, ...saved, settings: { ...base.settings, ...saved.settings }, stats: { ...base.stats, ...saved.stats } };
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Award any badges the new state has earned. */
      const awardBadges = (): string[] => {
        const s = get();
        const earned = newlyEarned({ stats: s.stats, done: s.done, phrases: Object.keys(s.srs).length }, s.badges);
        if (earned.length) {
          const now = Date.now();
          set({ badges: { ...s.badges, ...Object.fromEntries(earned.map((id) => [id, now])) } });
        }
        return earned;
      };

      return {
        ...fresh(),

        start: (name, lang) => set({ profile: { name: name.trim(), lang, createdAt: Date.now() } }),
        setLang: (lang) => set((s) => ({ profile: s.profile ? { ...s.profile, lang } : { name: '', lang, createdAt: Date.now() } })),
        setName: (name) => set((s) => (s.profile ? { profile: { ...s.profile, name: name.trim() } } : {})),
        setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),

        tick: () => set((s) => {
          const stats = regenHearts(s.stats, Date.now());
          return stats === s.stats ? {} : { stats };
        }),

        openChapter: (id) => set((s) => ({ opened: { ...s.opened, [id]: true } })),

        meet: (ids) => set((s) => {
          const today = dayKey();
          const srs = { ...s.srs };
          for (const id of ids) srs[id] = introduce(srs[id], today);
          return { srs };
        }),

        gradePhrases: (ids, correct) => set((s) => {
          const today = dayKey();
          const srs = { ...s.srs };
          for (const id of ids) srs[id] = grade(srs[id], correct, today);
          return { srs };
        }),

        loseHeart: () => set((s) => ({ stats: loseHeartRule(s.stats, Date.now()) })),

        completeLesson: ({ lessonId, graded, mistakes }) => {
          const ref = LESSONS[lessonId];
          const perfect = mistakes === 0;
          const { gems } = lessonReward(perfect);
          const accuracy = graded ? Math.max(0, (graded - mistakes) / graded) : 1;
          set((s) => {
            const prev = s.done[lessonId];
            let stats = recordActivity(regenHearts(s.stats, Date.now()), dayKey(), gems);
            if (perfect) stats = { ...stats, perfectLessons: stats.perfectLessons + 1 };
            if (ref?.lesson.dialogue) stats = { ...stats, dialoguesDone: stats.dialoguesDone + 1 };
            return {
              stats,
              done: {
                ...s.done,
                [lessonId]: {
                  completedAt: Date.now(),
                  bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
                  plays: (prev?.plays ?? 0) + 1,
                },
              },
              lastChapterId: ref ? ref.chapter.id : s.lastChapterId,
              opened: ref ? { ...s.opened, [ref.chapter.id]: true } : s.opened,
            };
          });
          return { gems, perfect, badges: awardBadges() };
        },

        completePractice: (kind) => {
          set((s) => {
            let stats = recordActivity(s.stats, dayKey(), PRACTICE_GEMS);
            // A review round "fetches water": all water pots are full again.
            if (kind === 'review') stats = refillHearts(stats, Date.now());
            if (kind === 'dialogue') stats = { ...stats, dialoguesDone: stats.dialoguesDone + 1 };
            return { stats };
          });
          return { gems: PRACTICE_GEMS, perfect: false, badges: awardBadges(), heartsRefilled: kind === 'review' };
        },

        buyRefill: () => {
          const next = buyRefillRule(get().stats, Date.now());
          if (!next) return false;
          set({ stats: next });
          return true;
        },

        noteRecording: () => {
          set((s) => ({ stats: { ...s.stats, recordings: s.stats.recordings + 1 } }));
          awardBadges();
        },

        takeFact: (count) => {
          const i = count > 0 ? get().factIndex % count : 0;
          set({ factIndex: i + 1 });
          return i;
        },

        placeOut: (chapterIds) =>
          set((s) => {
            const now = Date.now();
            const today = dayKey();
            const done = { ...s.done };
            const srs = { ...s.srs };
            for (const id of chapterIds) {
              for (const lesson of CHAPTERS[id]?.lessons ?? []) {
                done[lesson.id] ??= { completedAt: now, bestAccuracy: 1, plays: 0, placed: true };
                for (const pid of lesson.phrases) srs[pid] = introduce(srs[pid], today);
              }
            }
            return { done, srs, placementSeen: true };
          }),

        setPlacementSeen: () => set({ placementSeen: true }),
        saveCert: (part, cert) => set((s) => ({ certs: { ...s.certs, [String(part)]: cert } })),

        reset: () => set({ ...fresh() }),
      };
    },
    {
      name: STORE_KEY,
      version: 2,
      // v1 counted XP per day; v2 counts finished lessons and practice rounds per day.
      migrate: (persisted, from) => {
        const s = (persisted ?? {}) as Partial<Data> & { stats?: Partial<Stats> & { xpByDay?: Record<string, number> } };
        if (from < 2 && s.stats) {
          const { xpByDay, ...rest } = s.stats as Partial<Stats> & { xpByDay?: Record<string, number>; xp?: number };
          delete (rest as { xp?: number }).xp;
          const activityByDay = Object.fromEntries(Object.entries(xpByDay ?? {}).filter(([, v]) => v > 0).map(([d]) => [d, 1]));
          s.stats = { ...initialStats(Date.now()), ...rest, activityByDay };
        }
        return s as Data;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Data => snapshot(s),
    },
  ),
);

/** Lesson ids → true, the shape the unlock rules expect. */
export const selectDone = (s: AppState) => s.done;

export function chapterById(id: string) {
  return CHAPTERS[id];
}
