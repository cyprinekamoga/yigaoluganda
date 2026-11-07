import { normalize } from './text';

/** Forgiving form for search: ŋ = ng, and doubled letters count as single. */
export function loose(s: string): string {
  return normalize(s).replace(/ŋ/g, 'ng').replace(/(.)\1+/g, '$1');
}

export function matches(query: string, ...fields: string[]): boolean {
  const q = loose(query);
  if (!q) return true;
  return fields.some((f) => loose(f).includes(q));
}
