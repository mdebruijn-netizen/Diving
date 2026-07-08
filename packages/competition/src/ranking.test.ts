import { describe, it, expect } from 'vitest';
import { assignRanks, selectAdvancing } from './ranking';

const rows = [
  { entryId: 'A', total: 60 },
  { entryId: 'B', total: 50 },
  { entryId: 'C', total: 50 },
  { entryId: 'D', total: 40 },
];

describe('assignRanks', () => {
  it('shares a rank for ties (1, 2, 2, 4) by descending total', () => {
    const ranked = assignRanks(rows);
    expect(ranked.map((r) => [r.entryId, r.rank])).toEqual([
      ['A', 1],
      ['B', 2],
      ['C', 2],
      ['D', 4],
    ]);
  });
});

describe('selectAdvancing', () => {
  it('advances all divers tied on the cut line by default', () => {
    // top 2 but B and C tie at the line -> all three advance
    expect(selectAdvancing(rows, 2)).toEqual(['A', 'B', 'C']);
  });

  it('takes a strict cut when ties are excluded', () => {
    expect(selectAdvancing(rows, 2, { includeTies: false })).toEqual(['A', 'B']);
  });

  it('returns everyone when the field is smaller than the cut', () => {
    expect(selectAdvancing(rows, 10)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('returns nobody for a non-positive cut', () => {
    expect(selectAdvancing(rows, 0)).toEqual([]);
  });
});
