/**
 * Shared scoring primitives for the AquaMeet competition domain.
 *
 * Everything in `@aquameet/domain` is intentionally PURE (no I/O): the same
 * compiled code runs on the Cloudflare Worker, the venue hub, the desktop
 * scoretafel, the judge tablet and the mobile app, so the scoring math is
 * written and verified exactly once. See docs/adr/0001-architecture.md.
 */

/** Flight position of a dive (straight / pike / tuck / free). */
export type DivePosition = 'A' | 'B' | 'C' | 'D';

/** How a computed score is rounded to its official value. */
export interface RoundingConfig {
  decimals: number;
  /** Only half-up is implemented today; encoded so RulePacks stay explicit. */
  mode: 'half_up';
}

/** World Aquatics default: official scores are rounded to 2 decimals, half-up. */
export const DEFAULT_ROUNDING: RoundingConfig = { decimals: 2, mode: 'half_up' };

/**
 * A referee ruling that modifies a dive's score:
 * - `failed`: the dive scores 0.
 * - `balk`: 2 points are deducted from each judge's award.
 * - `deduction`: a configurable per-judge deduction.
 */
export type PenaltyModifier =
  | { type: 'failed' }
  | { type: 'balk' }
  | { type: 'deduction'; perJudge: number };

/** Per-judge points to subtract for a penalty (0 for `failed`, handled separately). */
export function perJudgeDeduction(penalty: PenaltyModifier | undefined): number {
  if (penalty?.type === 'balk') return 2;
  if (penalty?.type === 'deduction') return penalty.perJudge;
  return 0;
}
