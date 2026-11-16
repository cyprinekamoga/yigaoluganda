/**
 * Catches typos in the e-mail domain before an account is created ("gmail.clm", "gmial.com",
 * "hotmail.co"): a confirmation e-mail sent there never arrives, and the account can't be used.
 * Only suggests: the learner decides.
 */

const DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.se',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.se',
  'live.com',
  'live.se',
  'msn.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'yahoo.se',
  'yahoo.co.uk',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'telia.com',
  'bredband.net',
  'comhem.se',
  'spray.se',
];

/** Optimal string alignment distance (edits, with a swap of two neighbours counting as one). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** The address as it was probably meant, or null when it looks right (or is too unusual to guess). */
export function suggestEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (DOMAINS.includes(domain)) return null;
  // "gmail" with no ending at all.
  const bare = DOMAINS.find((d) => d.split('.')[0] === domain);
  if (bare) return `${local}@${bare}`;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const d of DOMAINS) {
    const dist = distance(domain, d);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  // One slip for short domains, two for longer ones; anything further is probably a real domain.
  const allowed = domain.length >= 8 ? 2 : domain.length >= 5 ? 1 : 0;
  return best && bestDist > 0 && bestDist <= allowed ? `${local}@${best}` : null;
}
