import { z } from 'zod';

/**
 * A RulePack is DATA, not code: a versioned, content-addressable definition of a
 * federation's scoring rules (panels, drop/normalise behaviour, rounding and the
 * Degree of Difficulty table). Every computed result records the pack version it
 * used, so results stay reproducible and auditable. See plan Deel 2 §D.
 */

export const divePositionSchema = z.enum(['A', 'B', 'C', 'D']);

export const ddEntrySchema = z.object({
  /** e.g. "springboard-3m", "platform-10m". */
  discipline: z.string().min(1),
  /** Dive group 1–6 (forward, back, reverse, inward, twist, armstand). */
  group: z.number().int().min(1).max(6),
  /** Dive code, e.g. "5253". */
  code: z.string().min(1),
  position: divePositionSchema,
  dd: z.number().positive(),
});

export const roundingSchema = z.object({
  decimals: z.number().int().min(0).max(4),
  mode: z.literal('half_up'),
});

export const individualPanelSchema = z.object({
  /** Allowed panel sizes (e.g. [3, 5, 7]). */
  sizes: z.array(z.number().int().positive()).nonempty(),
  /** Middle scores kept after dropping highest/lowest (World Aquatics: 3). */
  retain: z.number().int().positive(),
});

export const synchroPanelSchema = z.object({
  executionPerDiver: z.object({
    size: z.number().int().positive(),
    retain: z.number().int().positive(),
  }),
  synchronisation: z.object({
    size: z.number().int().positive(),
    retain: z.number().int().positive(),
  }),
  /** Explicit normalisation factor (World Aquatics: 0.6 = 3/5). */
  normalize: z.number().positive().optional(),
});

export const scoringSchema = z.object({
  increment: z.number().positive(),
  max: z.number().positive(),
  rounding: roundingSchema,
});

export const rulePackSchema = z.object({
  id: z.string().min(1),
  federation: z.string().min(1),
  version: z.string().min(1),
  effectiveDate: z.string().min(1),
  panels: z.object({
    individual: individualPanelSchema,
    synchro: synchroPanelSchema,
  }),
  scoring: scoringSchema,
  ddTable: z.array(ddEntrySchema),
});

export type RulePack = z.infer<typeof rulePackSchema>;
export type DdEntry = z.infer<typeof ddEntrySchema>;
export type DivePosition = z.infer<typeof divePositionSchema>;
