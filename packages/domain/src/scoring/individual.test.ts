import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeIndividualDive } from './individual';

describe('computeIndividualDive (World Aquatics individual)', () => {
  // Worked example from the architecture plan (Deel 2 §A.1).
  it('golden master: 7-judge panel, DD 3.0 -> 66.00', () => {
    const r = computeIndividualDive([7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0], 3.0);
    expect(r.retained).toEqual([7.0, 7.5, 7.5]);
    expect(r.droppedLow).toEqual([6.5, 7.0]);
    expect(r.droppedHigh).toEqual([8.0, 8.5]);
    expect(r.award).toBe(22.0);
    expect(r.normalizeFactor).toBe(1);
    expect(r.score).toBe(66.0);
  });

  it('5-judge panel retains the middle three', () => {
    const r = computeIndividualDive([6.0, 7.0, 8.0, 9.0, 5.0], 2.0);
    expect(r.retained).toEqual([6.0, 7.0, 8.0]);
    expect(r.award).toBe(21.0);
    expect(r.score).toBe(42.0);
  });

  it('rounds to two decimals (half-up)', () => {
    // award 22.5 * dd 2.05 = 46.125 -> 46.13
    const r = computeIndividualDive([7.5, 7.5, 7.5], 2.05);
    expect(r.score).toBe(46.13);
  });

  it('rejects a non-positive DD', () => {
    expect(() => computeIndividualDive([7, 7, 7], 0)).toThrow(/dd/);
  });

  it('property: the score is invariant under permutation of the raw scores', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }).map((n) => n / 2), {
          minLength: 7,
          maxLength: 7,
        }),
        fc.constantFrom(1.4, 2.0, 3.0),
        (scores, dd) => {
          const base = computeIndividualDive(scores, dd).score;
          const reversed = computeIndividualDive([...scores].reverse(), dd).score;
          return base === reversed;
        },
      ),
    );
  });

  it('property: scaling DD scales the score proportionally', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }).map((n) => n / 2), {
          minLength: 7,
          maxLength: 7,
        }),
        (scores) => {
          const single = computeIndividualDive(scores, 1.0).award;
          const triple = computeIndividualDive(scores, 3.0).score;
          // award * 1 * 3.0, rounded to 2dp
          return triple === Math.round(single * 3.0 * 100) / 100;
        },
      ),
    );
  });
});
