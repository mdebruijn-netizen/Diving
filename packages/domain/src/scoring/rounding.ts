import type { RoundingConfig } from '../types';

/** Round a raw score to its official value per the RulePack rounding config. */
export function roundScore(value: number, rounding: RoundingConfig): number {
  if (rounding.mode !== 'half_up') {
    throw new Error(`unsupported rounding mode: ${rounding.mode}`);
  }
  const factor = 10 ** rounding.decimals;
  const scaled = value * factor;
  // Strip binary floating-point noise (e.g. 46.125 stored as 46.124999…) before
  // applying half-up rounding, so a genuine .5 boundary rounds up correctly.
  const cleaned = Math.round(scaled * 1e6) / 1e6;
  // Scores are non-negative; Math.round is half-up toward +Infinity.
  return Math.round(cleaned) / factor;
}
