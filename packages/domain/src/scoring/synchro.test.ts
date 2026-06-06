import { describe, it, expect } from 'vitest';
import { computeSynchroDive } from './synchro';

describe('computeSynchroDive (World Aquatics synchronised)', () => {
  // Worked example from the architecture plan (Deel 2 §A.2).
  it('golden master: 11-judge layout, DD 2.4 -> 56.16', () => {
    const r = computeSynchroDive(
      {
        executionA: [7.5, 8.0, 8.5],
        executionB: [7.0, 7.5, 8.0],
        synchronisation: [7.0, 8.0, 7.5, 8.0, 8.5],
      },
      2.4,
    );
    expect(r.retainedExecutionA).toEqual([8.0]);
    expect(r.retainedExecutionB).toEqual([7.5]);
    expect(r.retainedSynchronisation).toEqual([7.5, 8.0, 8.0]);
    expect(r.award).toBe(39.0);
    expect(r.normalizeFactor).toBeCloseTo(0.6, 10);
    expect(r.score).toBe(56.16);
  });

  it('applies the 0.6 normalisation (3 / 5 retained)', () => {
    const r = computeSynchroDive(
      {
        executionA: [8.0, 8.0, 8.0],
        executionB: [8.0, 8.0, 8.0],
        synchronisation: [8.0, 8.0, 8.0, 8.0, 8.0],
      },
      2.0,
    );
    // award = 8 + 8 + 24 = 40; 40 * 0.6 * 2.0 = 48.00
    expect(r.award).toBe(40.0);
    expect(r.score).toBe(48.0);
  });

  it('rejects a non-positive DD', () => {
    expect(() =>
      computeSynchroDive(
        { executionA: [7, 7, 7], executionB: [7, 7, 7], synchronisation: [7, 7, 7, 7, 7] },
        -1,
      ),
    ).toThrow(/dd/);
  });
});
