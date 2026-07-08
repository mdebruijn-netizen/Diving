import { describe, it, expect } from 'vitest';
import { lookupDd, worldAquatics2025 } from '@aquameet/rule-packs';
import type { CategoryRules, DiveSheet } from './entities';
import { validateDiveSheet, type DdResolver } from './sheet-validation';

// Resolve DD against the World Aquatics preset's springboard-3m catalogue.
const resolveDd: DdResolver = (item) => {
  try {
    return lookupDd(worldAquatics2025, {
      discipline: 'springboard-3m',
      code: item.code,
      position: item.position,
    });
  } catch {
    return undefined;
  }
};

const baseRules: CategoryRules = { diveCount: 3, requireDistinctGroups: 2 };

function sheet(dives: Array<[string, 'A' | 'B' | 'C' | 'D']>): DiveSheet {
  return { entryId: 'entry-1', dives: dives.map(([code, position]) => ({ code, position })) };
}

describe('validateDiveSheet', () => {
  it('accepts a valid sheet', () => {
    const result = validateDiveSheet(
      sheet([
        ['101', 'B'],
        ['105', 'B'],
        ['5253', 'B'],
      ]),
      baseRules,
      resolveDd,
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.totalDd).toBe(6.8); // 1.4 + 2.4 + 3.0
  });

  it('flags the wrong number of dives', () => {
    const result = validateDiveSheet(sheet([['101', 'B']]), baseRules, resolveDd);
    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('WRONG_DIVE_COUNT');
  });

  it('flags an unknown dive (not in the DD catalogue)', () => {
    const result = validateDiveSheet(
      sheet([
        ['101', 'B'],
        ['105', 'B'],
        ['999', 'A'],
      ]),
      baseRules,
      resolveDd,
    );
    expect(result.issues.find((i) => i.code === 'UNKNOWN_DIVE')?.diveIndex).toBe(2);
  });

  it('flags a duplicate dive', () => {
    const result = validateDiveSheet(
      sheet([
        ['101', 'B'],
        ['101', 'B'],
        ['5253', 'B'],
      ]),
      baseRules,
      resolveDd,
    );
    expect(result.issues.map((i) => i.code)).toContain('DUPLICATE_DIVE');
  });

  it('flags insufficient group coverage', () => {
    const result = validateDiveSheet(
      sheet([
        ['101', 'B'],
        ['105', 'B'],
        ['107', 'B'],
      ]),
      { diveCount: 3, requireDistinctGroups: 2 },
      // all group 1; 107B unknown in the sample table -> resolves undefined but group still parses
      resolveDd,
    );
    expect(result.issues.map((i) => i.code)).toContain('INSUFFICIENT_GROUPS');
  });

  it('flags a DD limit exceeded (voluntary round)', () => {
    const result = validateDiveSheet(
      sheet([
        ['101', 'B'],
        ['105', 'B'],
        ['5253', 'B'],
      ]),
      { diveCount: 3, maxTotalDd: 5.0 },
      resolveDd,
    );
    expect(result.issues.map((i) => i.code)).toContain('DD_LIMIT_EXCEEDED');
  });
});
