import { describe, it, expect } from 'vitest';
import type { CategoryRules } from '@aquameet/competition';
import { parseSheetInput, validateSheet } from './view-model';

describe('parseSheetInput', () => {
  it('parses "code position" lines, tolerating whitespace', () => {
    const items = parseSheetInput('5253 B\n  101   b \n\n201 C');
    expect(items).toEqual([
      { code: '5253', position: 'B' },
      { code: '101', position: 'B' },
      { code: '201', position: 'C' },
    ]);
  });
});

describe('validateSheet against the FINA table', () => {
  const rules: CategoryRules = { diveCount: 6, requireDistinctGroups: 4 };
  const validSheet = ['101 B', '201 B', '301 B', '401 B', '5253 B', '105 B'].join('\n');

  it('accepts a real, well-formed sheet and sums the DDs', () => {
    const result = validateSheet('springboard-3m', parseSheetInput(validSheet), rules);
    expect(result.valid).toBe(true);
    expect(result.totalDd).toBeGreaterThan(0);
  });

  it('flags an unknown dive (not in the FINA table for this board)', () => {
    const result = validateSheet(
      'springboard-3m',
      parseSheetInput(['101 B', '201 B', '301 B', '401 B', '5253 B', '999 A'].join('\n')),
      rules,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'UNKNOWN_DIVE')).toBe(true);
  });

  it('flags insufficient group coverage', () => {
    const result = validateSheet(
      'springboard-3m',
      parseSheetInput(['101 B', '102 B', '103 B', '104 B', '105 B', '106 B'].join('\n')),
      rules,
    );
    expect(result.issues.some((i) => i.code === 'INSUFFICIENT_GROUPS')).toBe(true);
  });
});
