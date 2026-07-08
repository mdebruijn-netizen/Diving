import { describe, it, expect } from 'vitest';
import { computeIndividualDive } from '@aquameet/domain';
import { rulePackSchema, lookupDd, worldAquatics2025 } from './index';

describe('World Aquatics rule pack', () => {
  it('validates against the RulePack schema', () => {
    expect(() => rulePackSchema.parse(worldAquatics2025)).not.toThrow();
  });

  it('configures a 3-score individual award and 0.6 synchro normalisation', () => {
    expect(worldAquatics2025.panels.individual.retain).toBe(3);
    expect(worldAquatics2025.panels.synchro.normalize).toBe(0.6);
  });

  it('looks up a Degree of Difficulty', () => {
    const dd = lookupDd(worldAquatics2025, {
      discipline: 'springboard-3m',
      code: '5253',
      position: 'B',
    });
    expect(dd).toBe(3.0);
  });

  it('throws for an unknown dive', () => {
    expect(() =>
      lookupDd(worldAquatics2025, { discipline: 'springboard-3m', code: '9999', position: 'A' }),
    ).toThrow(/no DD entry/);
  });

  it('integrates pack DD lookup with the scoring engine', () => {
    const dd = lookupDd(worldAquatics2025, {
      discipline: 'springboard-3m',
      code: '5253',
      position: 'B',
    });
    const result = computeIndividualDive([7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0], dd, {
      retain: worldAquatics2025.panels.individual.retain,
      rounding: worldAquatics2025.scoring.rounding,
    });
    expect(result.score).toBe(66.0);
  });
});
