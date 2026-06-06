import { describe, it, expect } from 'vitest';
import type { SessionProjection } from '@aquameet/sync';
import { currentDive, formatScore, hasResults, rankedRows } from './view-model';

const projection: SessionProjection = {
  dives: [
    { diveId: 'd1', entryId: 'A', kind: 'individual', status: 'LOCKED', scoreCount: 7, score: 66.0, pending: false },
    { diveId: 'd2', entryId: 'B', kind: 'individual', status: 'OPEN', scoreCount: 2, pending: true },
  ],
  ranking: [
    { entryId: 'A', total: 66.0, scoredDives: 1 },
    { entryId: 'B', total: 66.0, scoredDives: 1 },
    { entryId: 'C', total: 40.0, scoredDives: 1 },
  ],
};

describe('web view-model', () => {
  it('ranks with shared-place ties', () => {
    expect(rankedRows(projection).map((r) => [r.entryId, r.rank])).toEqual([
      ['A', 1],
      ['B', 1],
      ['C', 3],
    ]);
  });

  it('formats scores to two decimals with a dash fallback', () => {
    expect(formatScore(66)).toBe('66.00');
    expect(formatScore(undefined)).toBe('—');
  });

  it('highlights the first pending dive as current', () => {
    expect(currentDive(projection)?.diveId).toBe('d2');
  });

  it('reports whether there are results yet', () => {
    expect(hasResults(projection)).toBe(true);
    expect(hasResults({ dives: [], ranking: [] })).toBe(false);
  });
});
