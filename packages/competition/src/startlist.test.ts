import { describe, it, expect } from 'vitest';
import { generateDraw, seededShuffle } from './startlist';

const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ entryId: `e${i}` }));

describe('start-list draw', () => {
  it('random draw is a reproducible permutation for a given seed', () => {
    const a = generateDraw(ids(8), 'random', 12345);
    const b = generateDraw(ids(8), 'random', 12345);
    expect(a).toEqual(b); // deterministic
    expect(a.map((d) => d.entryId).sort()).toEqual(ids(8).map((e) => e.entryId).sort()); // permutation
    expect(a.map((d) => d.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('different seeds generally give different orders', () => {
    const a = generateDraw(ids(8), 'random', 1).map((d) => d.entryId);
    const b = generateDraw(ids(8), 'random', 2).map((d) => d.entryId);
    expect(a).not.toEqual(b);
  });

  it('seeded draw orders by seed ascending, unseeded entries last', () => {
    const draw = generateDraw(
      [
        { entryId: 'strong', seed: 3 },
        { entryId: 'weak', seed: 1 },
        { entryId: 'mid', seed: 2 },
        { entryId: 'unseeded' },
      ],
      'seeded',
      0,
    );
    expect(draw.map((d) => d.entryId)).toEqual(['weak', 'mid', 'strong', 'unseeded']);
  });

  it('seededShuffle keeps every element', () => {
    const out = seededShuffle([1, 2, 3, 4, 5], 99);
    expect(out.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});
