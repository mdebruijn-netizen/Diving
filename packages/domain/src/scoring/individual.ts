import type { PenaltyModifier, RoundingConfig } from '../types';
import { DEFAULT_ROUNDING, perJudgeDeduction } from '../types';
import { dropAndRetain, sum } from './drop';
import { roundScore } from './rounding';

export interface IndividualScoreOptions {
  /** Number of middle scores kept (World Aquatics: 3). */
  retain?: number;
  rounding?: RoundingConfig;
  /**
   * Normalisation factor applied to the award. Defaults to `3 / retain`, which
   * yields 1 for the standard 3-score award and generalises any panel size to a
   * 3-judge equivalent. Override only for non-standard federations.
   */
  normalizeFactor?: number;
  /** Referee ruling that modifies the score (balk, failed, deduction). */
  penalty?: PenaltyModifier;
}

export interface IndividualDiveResult {
  rawScores: number[];
  retained: number[];
  droppedLow: number[];
  droppedHigh: number[];
  /** Sum of the retained scores. */
  award: number;
  normalizeFactor: number;
  dd: number;
  /** Official, rounded dive score. */
  score: number;
}

/**
 * Score one individual dive: drop highest/lowest to the retained middle, sum,
 * normalise, multiply by the degree of difficulty, and round.
 */
export function computeIndividualDive(
  rawScores: readonly number[],
  dd: number,
  options: IndividualScoreOptions = {},
): IndividualDiveResult {
  if (!(dd > 0)) {
    throw new Error(`dd must be > 0, got ${dd}`);
  }
  const retain = options.retain ?? 3;
  const rounding = options.rounding ?? DEFAULT_ROUNDING;
  // A balk/deduction lowers every judge's score (floored at 0) before the drop.
  const deduction = perJudgeDeduction(options.penalty);
  const adjusted = deduction > 0 ? rawScores.map((s) => Math.max(0, s - deduction)) : rawScores;
  const { retained, droppedLow, droppedHigh } = dropAndRetain(adjusted, retain);
  const failed = options.penalty?.type === 'failed';
  const award = failed ? 0 : sum(retained);
  const normalizeFactor = options.normalizeFactor ?? 3 / retain;
  const score = failed ? 0 : roundScore(award * normalizeFactor * dd, rounding);
  return {
    rawScores: [...rawScores],
    retained,
    droppedLow,
    droppedHigh,
    award,
    normalizeFactor,
    dd,
    score,
  };
}
