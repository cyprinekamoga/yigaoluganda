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
  PRACTICE_XP,
  recordActivity,
  refillHearts,
  regenHearts,
  type Stats,
} from '../logic/progress';
import { grade, introduce, type SrsCard } from '../logic/srs';

export interface Profile {
  name: string;
  lang: Lang;
  createdAt: number;
}

export interface Settings {
  sfx: boolean;
  haptics: boolean;
}

export interface LessonRecord {
  completedAt: number;
  bestAccuracy: number;
  plays: number;
}

export interface LessonResult {
  lessonId: string;
  graded: number;
  mistakes: number;
}

export interface Reward {
  xp: number;
  gems: number;
  perfect: boolean;
  badges: string[];
  heartsRefilled?: boolean;
}

interface Data {
  profile: Profile | null;
  settings: Settings;
  stats: Stats;
  done: Record<string, LessonRecord>;
  opened: Record<string, true>;
  lastChapterId: string | null;
  srs: Record<string, SrsCard>;
  badges: Record<string, number>;
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
  reset(): void;
}

export type AppState = Data & Actions;

const fresh = (): Data => ({
  profile: null,
  settings: { sfx: true, haptics: true },
  stats: initialStats(Date.now()),
  done: {},
  opened: {},
  lastChapterId: null,
  srs: {},
  badges: {},
});

export const STORE_KEY = 'yiga-oluganda-v2';

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Award any badges the new state has earned. */
      const awardBadges = (): string[] => {
        const s = get();
        const earned = newlyEarned({ stats: s.stats, done: s.done }, s.badges);
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
          const { xp, gems } = lessonReward(perfect);
          const accuracy = graded ? Math.max(0, (graded - mistakes) / graded) : 1;
          set((s) => {
            const prev = s.done[lessonId];
            let stats = recordActivity(regenHearts(s.stats, Date.now()), dayKey(), xp, gems);
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
          return { xp, gems, perfect, badges: awardBadges() };
        },

        completePractice: (kind) => {
          set((s) => {
            let stats = recordActivity(s.stats, dayKey(), PRACTICE_XP, PRACTICE_GEMS);
            // A review round refills hearts (PRD: "refreshed via time delay or review mode").
            if (kind === 'review') stats = refillHearts(stats, Date.now());
            if (kind === 'dialogue') stats = { ...stats, dialoguesDone: stats.dialoguesDone + 1 };
            return { stats };
          });
          return { xp: PRACTICE_XP, gems: PRACTICE_GEMS, perfect: false, badges: awardBadges(), heartsRefilled: kind === 'review' };
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

        reset: () => set({ ...fresh() }),
      };
    },
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Data => ({
        profile: s.profile,
        settings: s.settings,
        stats: s.stats,
        done: s.done,
        opened: s.opened,
        lastChapterId: s.lastChapterId,
        srs: s.srs,
        badges: s.badges,
      }),
    },
  ),
);

/** Lesson ids → true, the shape the unlock rules expect. */
export const selectDone = (s: AppState) => s.done;

export function chapterById(id: string) {
  return CHAPTERS[id];
}
