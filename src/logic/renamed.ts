/**
 * Phrases whose id changed, old → new. 'agandi' (Agandi?) is Runyankole/Rukiga, not Luganda: it
 * became 'bigenda-bitya' (Bigenda bitya?), and what a learner had learned of it moves along.
 */
export const RENAMED_PHRASES: Record<string, string> = { agandi: 'bigenda-bitya' };

/** A learner's cards with renamed phrases under their new id (a card already there is kept). */
export function renamePhrases<T>(srs: Record<string, T> | undefined): Record<string, T> | undefined {
  if (!srs || !Object.keys(RENAMED_PHRASES).some((old) => old in srs)) return srs;
  const out: Record<string, T> = {};
  for (const [id, card] of Object.entries(srs)) {
    const to = RENAMED_PHRASES[id] ?? id;
    if (to === id || !(to in srs)) out[to] = card;
  }
  return out;
}
