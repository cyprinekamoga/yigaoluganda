import { useCallback } from 'react';
import { getLocales } from 'expo-localization';
import type { Lang, T } from '../content/types';
import { useApp } from '../state/store';
import { en, type Key } from './en';
import { sv } from './sv';

export type { Key };
export const DICTS: Record<Lang, Record<Key, string>> = { en, sv };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Best guess for first launch: Swedish if the device prefers it, otherwise English. */
export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'sv' ? 'sv' : 'en';
  } catch {
    return 'en';
  }
}

export function useLang(): Lang {
  return useApp((s) => s.profile?.lang) ?? deviceLang();
}

/** t(key, vars) for UI text and tr(T) for content text, in the learner's language. */
export function useT() {
  const lang = useLang();
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const tr = useCallback((text: T | undefined) => (text ? text[lang] : ''), [lang]);
  return { t, tr, lang };
}
