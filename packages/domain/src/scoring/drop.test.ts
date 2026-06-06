import { describe, it, expect } from 'vitest';
import { dropAndRetain, sum } from './drop';

describe('dropAndRetain', () => {
  it('drops 2 high + 2 low from a 7-judge panel', () => {
    const r = dropAndRetain([7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0], 3);
    expect(r.retained).toEqual([7.0, 7.5, 7.5]);
    expect(r.droppedLow).toEqual([6.5, 7.0]);
    expect(r.droppedHigh).toEqual([8.0, 8.5]);
  });

  it('drops 1 high + 1 low from a 5-judge panel', () => {
    const r = dropAndRetain([6.0, 7.0, 8.0, 9.0, 5.0], 3);
    expect(r.retained).toEqual([6.0, 7.0, 8.0]);
  });

  it('keeps every score for a 3-judge panel', () => {
    const r = dropAndRetain([6.0, 7.0, 8.0], 3);
    expect(r.retained).toEqual([6.0, 7.0, 8.0]);
    expect(r.droppedHigh).toEqual([]);
    expect(r.droppedLow).toEqual([]);
  });

  it('drops equal extreme values per occurrence', () => {
    const r = dropAndRetain([8.0, 8.0, 8.0, 8.0, 8.0], 3);
    expect(r.retained).toEqual([8.0, 8.0, 8.0]);
  });

  it('rejects an asymmetric reduction', () => {
    expect(() => dropAndRetain([7, 8, 9, 6], 3)).toThrow(/symmetrically/);
  });

  it('rejects retaining more than provided', () => {
    expect(() => dropAndRetain([7, 8], 3)).toThrow();
  });

  it('sums values', () => {
    expect(sum([7.0, 7.5, 7.5])).toBe(22.0);
  });
});
