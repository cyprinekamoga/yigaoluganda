/** Text helpers for comparing Luganda answers. Doubled letters are NEVER collapsed: length changes meaning. */

const PUNCT = /[.,!?¿¡…;:"“”()«»]/g;

/** Lower-case, unify apostrophes, treat ng' as ŋ, drop punctuation and extra spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´ʼ]/g, "'")
    .replace(/ng'/g, 'ŋ')
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sameText(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** Replace the {name} placeholder with the learner's name. */
export function fillName(s: string, name: string): string {
  return s.replace(/\{name\}/g, name || 'Alex');
}

/** Words that keep their capital letter when they become a tile. */
const PROPER = new Set(['Kampala', 'Oluganda', 'Nakasero', 'Ngaali', 'Nakato', 'Nnaalongo', 'Jjajja']);

/** Strip surrounding punctuation from a token. */
export function bareToken(token: string): string {
  return token.replace(/^[.,!?¿¡…;:"“”()]+|[.,!?¿¡…;:"“”()]+$/g, '');
}

/**
 * Split a Luganda sentence into word-bank tiles.
 * Sentence-initial capitals are lowered unless the word is a name.
 */
export function tilesOf(lg: string, name: string): string[] {
  const filled = fillName(lg, name);
  const words = filled.split(/\s+/).map(bareToken).filter(Boolean);
  return words.map((w, i) => {
    if (i === 0 && !PROPER.has(w) && w !== name) return w.charAt(0).toLowerCase() + w.slice(1);
    return w;
  });
}

/** Display form of a phrase for option buttons: no trailing punctuation. */
export function optionForm(lg: string): string {
  return bareToken(lg.trim());
}
