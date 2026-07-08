import ddData from '../data/fina-2017-2021-dd.json';
import { rulePackSchema, type DdEntry, type RulePack } from '../schema';

/**
 * FINA Degree of Difficulty table, 2017–2021 cycle.
 *
 * Imported from the official FINA Diving manual (Appendix 2 — springboard 1m/3m,
 * and Appendix 4 — platform 5m/7.5m/10m) by coordinate-accurate table extraction
 * and verified against the worked examples in Appendix 1. 950 dive/position
 * entries across five disciplines. This is real licensed data, not invented here.
 */
const FINA_DD = ddData as unknown as DdEntry[];

export const finaDiving20172021: RulePack = rulePackSchema.parse({
  id: 'fina-2017-2021',
  federation: 'FINA',
  version: '2017-2021',
  effectiveDate: '2017-09-12',
  panels: {
    individual: { sizes: [3, 5, 7], retain: 3 },
    synchro: {
      executionPerDiver: { size: 3, retain: 1 },
      synchronisation: { size: 5, retain: 3 },
      normalize: 0.6,
    },
  },
  scoring: { increment: 0.5, max: 10, rounding: { decimals: 2, mode: 'half_up' } },
  ddTable: FINA_DD,
});
