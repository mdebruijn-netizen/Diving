/**
 * Symmetric drop-highest/drop-lowest reduction, the building block shared by
 * individual and synchronised diving scoring.
 */

export interface DropResult {
  /** Input scores sorted ascending. */
  sorted: number[];
  /** The middle scores that count towards the award. */
  retained: number[];
  /** Discarded lowest scores (ascending). */
  droppedLow: number[];
  /** Discarded highest scores (ascending). */
  droppedHigh: number[];
}

/**
 * Reduce `scores` to exactly `retain` middle values by dropping an equal number
 * of the highest and lowest. Equal extreme values are dropped per-occurrence
 * (we drop values, not distinct values), matching World Aquatics rules.
 */
export function dropAndRetain(scores: readonly number[], retain: number): DropResult {
  if (!Number.isInteger(retain) || retain < 1) {
    throw new Error(`retain must be a positive integer, got ${retain}`);
  }
  if (retain > scores.length) {
    throw new Error(`cannot retain ${retain} of ${scores.length} scores`);
  }
  const diff = scores.length - retain;
  if (diff % 2 !== 0) {
    throw new Error(
      `a panel of ${scores.length} cannot be symmetrically reduced to ${retain} (difference ${diff} is odd)`,
    );
  }
  const dropEach = diff / 2;
  const sorted = [...scores].sort((a, b) => a - b);
  const droppedLow = sorted.slice(0, dropEach);
  const droppedHigh = dropEach > 0 ? sorted.slice(sorted.length - dropEach) : [];
  const retained = sorted.slice(dropEach, sorted.length - dropEach);
  return { sorted, retained, droppedLow, droppedHigh };
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
