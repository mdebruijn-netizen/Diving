import { describe, it, expect } from 'vitest';
import { computeIndividualDive } from '@aquameet/domain';
import { finaDiving20172021 } from './presets/fina-2017-2021';
import { lookupDd } from './dd';
import { validateDdTable } from './dd-import';

const dd = (discipline: string, code: string, position: 'A' | 'B' | 'C' | 'D') =>
  lookupDd(finaDiving20172021, { discipline, code, position });

describe('FINA 2017–2021 DD preset', () => {
  it('is a validated, conflict-free table', () => {
    expect(validateDdTable(finaDiving20172021.ddTable).ok).toBe(true);
  });

  it('covers all five disciplines with the full entry count', () => {
    const disciplines = new Set(finaDiving20172021.ddTable.map((e) => e.discipline));
    expect(disciplines).toEqual(
      new Set(['springboard-1m', 'springboard-3m', 'platform-5m', 'platform-7.5m', 'platform-10m']),
    );
    expect(finaDiving20172021.ddTable.length).toBe(950);
  });

  it('matches the worked examples from the FINA manual (Appendix 1)', () => {
    expect(dd('springboard-3m', '207', 'B')).toBe(3.9);
    expect(dd('springboard-3m', '309', 'B')).toBe(4.7);
    expect(dd('springboard-3m', '5253', 'B')).toBe(3.4);
    expect(dd('springboard-3m', '5255', 'B')).toBe(3.8);
    expect(dd('springboard-3m', '5355', 'B')).toBe(3.7);
    expect(dd('springboard-3m', '313', 'C')).toBe(2.2);
  });

  it('has distinct DDs per board/height for the same dive', () => {
    expect(dd('springboard-1m', '101', 'A')).toBe(1.4);
    expect(dd('springboard-3m', '101', 'A')).toBe(1.6);
    expect(dd('platform-5m', '101', 'A')).toBe(1.4);
    expect(dd('platform-10m', '101', 'A')).toBe(1.6);
  });

  it('scores a real dive end-to-end against the preset', () => {
    const value = dd('platform-10m', '207', 'C'); // 3.3
    expect(value).toBe(3.3);
    const result = computeIndividualDive([8, 8, 8, 8, 8, 8, 8], value);
    expect(result.score).toBe(79.2); // 24 * 3.3
  });
});
