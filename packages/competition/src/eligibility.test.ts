import { describe, it, expect } from 'vitest';
import { ageBandLabel, isDiverEligible, isOwnGroup } from './eligibility';

// Group E (youngest/easiest) = born 2016–2017; group D (older) = born 2014–2015.
const E = { minBirthYear: 2016, maxBirthYear: 2017 };
const D = { minBirthYear: 2014, maxBirthYear: 2015 };

describe('age-band eligibility', () => {
  it("lets a diver enter their own group and older/harder groups, never younger ones", () => {
    // Elliot, born 2017 → own group E, may move up to D.
    expect(isDiverEligible(2017, E)).toBe(true);
    expect(isDiverEligible(2017, D)).toBe(true);
    expect(isOwnGroup(2017, E)).toBe(true);
    expect(isOwnGroup(2017, D)).toBe(false);

    // A 2015 diver (own group D) may not drop into the younger/easier group E.
    expect(isDiverEligible(2015, E)).toBe(false);
    expect(isDiverEligible(2015, D)).toBe(true);
  });

  it('treats a band with no minimum as open to everyone', () => {
    expect(isDiverEligible(2030, { maxBirthYear: 2000 })).toBe(true);
  });

  it('labels bands', () => {
    expect(ageBandLabel(E)).toBe('born 2016–2017');
    expect(ageBandLabel({ minBirthYear: 2016 })).toBe('born ≥ 2016');
    expect(ageBandLabel({})).toBeUndefined();
  });
});
