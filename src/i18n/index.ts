import en from './en.json'
import sv from './sv.json'
import type { Lang } from '../content/types'

/**
 * All interface text lives in the JSON files in this folder.
 * To add a language: copy en.json to <code>.json, translate the values and add it to `dictionaries`.
 */
export const dictionaries = { en, sv } as const satisfies Record<Lang, unknown>

export const UI_LANGS: Lang[] = ['sv', 'en']

type Vars = Record<string, string | number>

function lookup(lang: Lang, key: string): unknown {
  let node: unknown = dictionaries[lang]
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return node
}

function fill(text: string, vars?: Vars): string {
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text
}

export function translate(lang: Lang, key: string, vars?: Vars): string {
  const value = lookup(lang, key) ?? lookup('en', key)
  return typeof value === 'string' ? fill(value, vars) : key
}

export function translateList(lang: Lang, key: string): string[] {
  const value = lookup(lang, key) ?? lookup('en', key)
  return Array.isArray(value) ? (value as string[]) : []
}

export type TFunction = (key: string, vars?: Vars) => string

export function makeT(lang: Lang): TFunction {
  return (key, vars) => translate(lang, key, vars)
}
