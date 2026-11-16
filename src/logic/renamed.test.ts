import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHRASES } from '../content';
import { RENAMED_PHRASES, renamePhrases } from './renamed';

describe('renamed phrases', () => {
  it('moves what a learner learned to the new id', () => {
    const card = { box: 2, due: '2026-11-20' };
    expect(renamePhrases({ agandi: card, 'oli-otya': card })).toEqual({ 'bigenda-bitya': card, 'oli-otya': card });
  });

  it('keeps a card already under the new id', () => {
    const old = { box: 1 };
    const current = { box: 3 };
    expect(renamePhrases({ agandi: old, 'bigenda-bitya': current })).toEqual({ 'bigenda-bitya': current });
  });

  it('leaves other progress alone', () => {
    const srs = { 'oli-otya': { box: 1 } };
    expect(renamePhrases(srs)).toBe(srs);
    expect(renamePhrases(undefined)).toBeUndefined();
  });

  it('every new id is in the course and no old id is', () => {
    for (const [old, to] of Object.entries(RENAMED_PHRASES)) {
      expect(PHRASES[to], to).toBeDefined();
      expect(PHRASES[old], old).toBeUndefined();
    }
  });

  it('the course has no Agandi (Runyankole/Rukiga, not Luganda), in phrases, dialogues or stories', () => {
    const root = path.join(import.meta.dirname, '../../content');
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) expect(readFileSync(path.join(root, f), 'utf8').toLowerCase(), f).not.toContain('agandi');
  });
});
