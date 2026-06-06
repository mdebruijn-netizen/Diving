import { rulePackSchema, type RulePack } from '../schema';

/**
 * World Aquatics preset.
 *
 * Panel/scoring configuration reflects the current World Aquatics individual and
 * synchronised rules. The `ddTable` here is an ILLUSTRATIVE SAMPLE only — the
 * full official Degree of Difficulty tables are imported and snapshot-validated
 * in a later phase (see plan Deel 3 §Q). Do not rely on these DD values for real
 * competitions yet.
 */
const raw = {
  id: 'world-aquatics-2025',
  federation: 'WORLD_AQUATICS',
  version: '2025.1.0',
  effectiveDate: '2025-01-01',
  panels: {
    individual: { sizes: [3, 5, 7], retain: 3 },
    synchro: {
      executionPerDiver: { size: 3, retain: 1 },
      synchronisation: { size: 5, retain: 3 },
      normalize: 0.6,
    },
  },
  scoring: {
    increment: 0.5,
    max: 10,
    rounding: { decimals: 2, mode: 'half_up' },
  },
  // ⚠️ Sample DD entries — replace with the official table import.
  ddTable: [
    { discipline: 'springboard-3m', group: 1, code: '101', position: 'B', dd: 1.4 },
    { discipline: 'springboard-3m', group: 1, code: '105', position: 'B', dd: 2.4 },
    { discipline: 'springboard-3m', group: 5, code: '5253', position: 'B', dd: 3.0 },
    { discipline: 'platform-10m', group: 2, code: '205', position: 'C', dd: 3.0 },
  ],
} as const;

export const worldAquatics2025: RulePack = rulePackSchema.parse(raw);
