import type { PenaltyModifier, RoundingConfig } from '../types';
import { DEFAULT_ROUNDING, perJudgeDeduction } from '../types';
import { dropAndRetain, sum } from './drop';
import { roundScore } from './rounding';

export interface SynchroPanels {
  /** Judges scoring diver A's execution. */
  executionA: number[];
  /** Judges scoring diver B's execution. */
  executionB: number[];
  /** Judges scoring how synchronised the pair is. */
  synchronisation: number[];
}

export interface SynchroScoreOptions {
  /** Scores kept per execution panel after drop (World Aquatics: 1). */
  executionRetain?: number;
  /** Scores kept on the synchronisation panel after drop (World Aquatics: 3). */
  synchronisationRetain?: number;
  rounding?: RoundingConfig;
  /**
   * Normalisation factor. Defaults to `3 / totalRetained`. With the World
   * Aquatics 11-judge layout (1 + 1 + 3 = 5 retained) this resolves to 0.6.
   */
  normalizeFactor?: number;
  /** Referee ruling that modifies the score (balk, failed, deduction). */
  penalty?: PenaltyModifier;
}

export interface SynchroDiveResult {
  retainedExecutionA: number[];
  retainedExecutionB: number[];
  retainedSynchronisation: number[];
  /** Sum of all retained scores across the three panels. */
  award: number;
  normalizeFactor: number;
  dd: number;
  /** Official, rounded dive score. */
  score: number;
}

/**
 * Score one synchronised dive: reduce each of the three panels independently,
 * combine the retained scores, normalise (×0.6 for the standard layout),
 * multiply by the degree of difficulty, and round.
 */
export function computeSynchroDive(
  panels: SynchroPanels,
  dd: number,
  options: SynchroScoreOptions = {},
): SynchroDiveResult {
  if (!(dd > 0)) {
    throw new Error(`dd must be > 0, got ${dd}`);
  }
  const executionRetain = options.executionRetain ?? 1;
  const synchronisationRetain = options.synchronisationRetain ?? 3;
  const rounding = options.rounding ?? DEFAULT_ROUNDING;
  const deduction = perJudgeDeduction(options.penalty);
  const adjust = (xs: number[]): number[] =>
    deduction > 0 ? xs.map((s) => Math.max(0, s - deduction)) : xs;

  const retainedExecutionA = dropAndRetain(adjust(panels.executionA), executionRetain).retained;
  const retainedExecutionB = dropAndRetain(adjust(panels.executionB), executionRetain).retained;
  const retainedSynchronisation = dropAndRetain(
    adjust(panels.synchronisation),
    synchronisationRetain,
  ).retained;

  const retainedCount =
    retainedExecutionA.length + retainedExecutionB.length + retainedSynchronisation.length;
  const failed = options.penalty?.type === 'failed';
  const award = failed ? 0 : sum(retainedExecutionA) + sum(retainedExecutionB) + sum(retainedSynchronisation);
  const normalizeFactor = options.normalizeFactor ?? 3 / retainedCount;
  const score = failed ? 0 : roundScore(award * normalizeFactor * dd, rounding);

  return {
    retainedExecutionA,
    retainedExecutionB,
    retainedSynchronisation,
    award,
    normalizeFactor,
    dd,
    score,
  };
}
