import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '../content';
import { restore, snapshot, useApp, type Data } from '../state/store';

/**
 * Who is learning on this account: the account holder ("main") and up to four children, each
 * with their own progress. The app's state (useApp) always holds the active learner's progress;
 * the others wait in `saved` until someone switches to them. A child profile is kids mode:
 * no water pots to lose, nothing to buy or send, and a grown-up check to leave it.
 */

export const MAIN = 'main';

/**
 * Children's profiles come with the Family plan, which is not built yet. Until it is, kids mode
 * stays off so the profiles are not free; test builds turn it on with EXPO_PUBLIC_KIDS=1.
 */
export const KIDS_MODE = process.env.EXPO_PUBLIC_KIDS === '1';
export const MAX_CHILDREN = 4;

export interface ChildProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface LearnersState {
  /** MAIN or a child's id. */
  active: string;
  children: ChildProfile[];
  /** Progress of the learners who aren't active, kept on this device. */
  saved: Record<string, Data>;
}

export const useLearners = create<LearnersState>()(
  persist(() => ({ active: MAIN, children: [] as ChildProfile[], saved: {} as Record<string, Data> }), {
    name: 'yiga-learners-v1',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export const selectIsKid = (s: LearnersState) => s.active !== MAIN;
export const useIsKid = () => useLearners(selectIsKid);

export function activeChild(s: LearnersState = useLearners.getState()): ChildProfile | null {
  return s.children.find((c) => c.id === s.active) ?? null;
}

/** Progress for a child who hasn't learned anything yet: their name and the family's language. */
export function freshChild(child: ChildProfile, lang: Lang): Data {
  return restore({ profile: { name: child.name, lang, createdAt: child.createdAt } });
}

/** A learner's current progress, wherever it is kept. */
export function progressOf(id: string): Data | null {
  const s = useLearners.getState();
  if (id === s.active) return snapshot(useApp.getState());
  return s.saved[id] ?? null;
}

type SwitchListener = (phase: 'before' | 'after', from: string, to: string) => void;
const listeners = new Set<SwitchListener>();
/** Sync listens here: it uploads the outgoing learner before the switch. */
export function onLearnerSwitch(l: SwitchListener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

let switching = false;
/** True while the app's state is being swapped to another learner (not a change to upload). */
export const isSwitching = () => switching;

/** Puts another learner's progress in the app. */
export function switchLearner(id: string) {
  const s = useLearners.getState();
  if (id === s.active) return;
  const child = s.children.find((c) => c.id === id);
  if (id !== MAIN && !child) return;
  const from = s.active;
  listeners.forEach((l) => l('before', from, id));
  const current = snapshot(useApp.getState());
  const lang = current.profile?.lang ?? 'en';
  const next = s.saved[id] ? restore(s.saved[id]) : child ? freshChild(child, lang) : restore({});
  const saved = { ...s.saved, [from]: current };
  delete saved[id];
  switching = true;
  try {
    useLearners.setState({ active: id, saved });
    useApp.setState(next);
  } finally {
    switching = false;
  }
  listeners.forEach((l) => l('after', from, id));
}

/** Adds a child on this device (the account version first creates it on the server for its id). */
export function addChildLocal(child: ChildProfile) {
  const s = useLearners.getState();
  if (s.children.some((c) => c.id === child.id)) return;
  useLearners.setState({ children: [...s.children, child].slice(0, MAX_CHILDREN) });
}

export function renameChildLocal(id: string, name: string) {
  const s = useLearners.getState();
  const clean = name.trim();
  if (!clean) return;
  const saved = s.saved[id] ? { ...s.saved, [id]: { ...s.saved[id], profile: s.saved[id].profile ? { ...s.saved[id].profile!, name: clean } : null } } : s.saved;
  useLearners.setState({ children: s.children.map((c) => (c.id === id ? { ...c, name: clean } : c)), saved });
  if (s.active === id) useApp.getState().setName(clean);
}

export function removeChildLocal(id: string) {
  if (useLearners.getState().active === id) switchLearner(MAIN);
  const s = useLearners.getState();
  const saved = { ...s.saved };
  delete saved[id];
  useLearners.setState({ children: s.children.filter((c) => c.id !== id), saved });
}

/** Another person signed in (or nobody): start again with only the account holder. */
export function resetLearners() {
  useLearners.setState({ active: MAIN, children: [], saved: {} });
}

/** A random id for a child created without an account (the server makes them otherwise). */
export function localId(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}
