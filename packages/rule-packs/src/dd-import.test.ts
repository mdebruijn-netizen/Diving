import { describe, it, expect } from 'vitest';
import { parseDdCsv, validateDdTable, withDdTable } from './dd-import';
import { lookupDd } from './dd';
import { worldAquatics2025 } from './presets/world-aquatics';

const csv = `discipline,group,code,position,dd
springboard-3m,1,101,B,1.4
springboard-3m,1,105,B,2.4
springboard-3m,5,5253,B,3.0`;

describe('parseDdCsv', () => {
  it('parses a well-formed CSV into validated DD entries', () => {
    const entries = parseDdCsv(csv);
    expect(entries).toHaveLength(3);
    expect(entries[2]).toEqual({ discipline: 'springboard-3m', group: 5, code: '5253', position: 'B', dd: 3.0 });
  });

  it('throws on a missing required column', () => {
    expect(() => parseDdCsv('group,code,position,dd\n1,101,B,1.4')).toThrow(/discipline/);
  });

  it('throws on an invalid row', () => {
    expect(() => parseDdCsv(`discipline,group,code,position,dd\nsb,1,101,Z,1.4`)).toThrow(/row 1/);
  });
});

describe('validateDdTable', () => {
  it('accepts a clean table', () => {
    expect(validateDdTable(parseDdCsv(csv)).ok).toBe(true);
  });

  it('flags duplicates, group mismatches and implausible DDs', () => {
    const result = validateDdTable([
      { discipline: 'sb', group: 1, code: '101', position: 'B', dd: 1.4 },
      { discipline: 'sb', group: 1, code: '101', position: 'B', dd: 1.4 }, // duplicate
      { discipline: 'sb', group: 2, code: '101', position: 'B', dd: 1.4 }, // group mismatch
      { discipline: 'sb', group: 1, code: '199', position: 'B', dd: 9.9 }, // implausible dd
    ]);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('DUPLICATE');
    expect(codes).toContain('GROUP_MISMATCH');
    expect(codes).toContain('IMPLAUSIBLE_DD');
    expect(result.ok).toBe(false);
  });
});

describe('withDdTable', () => {
  it('produces a pack whose DD lookups use the imported table', () => {
    const pack = withDdTable(worldAquatics2025, parseDdCsv(csv));
    expect(lookupDd(pack, { discipline: 'springboard-3m', code: '105', position: 'B' })).toBe(2.4);
  });
});
