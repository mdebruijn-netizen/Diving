/**
 * Structural parsing of a World Aquatics dive code.
 *
 * This decomposes the standard numbering so we can reason about a dive's group
 * (for group-coverage rules) and describe it. It does NOT decide whether a
 * dive is "legal" — authoritative validity is whether the (discipline, code,
 * position) exists in the RulePack DD table (see sheet-validation).
 *
 * Numbering:
 *  - digit 1 = group: 1 forward, 2 back, 3 reverse, 4 inward, 5 twisting, 6 armstand
 *  - groups 1–4 (3 digits): [group][flying 0/1][half-somersaults]
 *  - group 5 (4 digits):     [5][direction 1–4][half-somersaults][half-twists]
 *  - group 6 armstand:       [6][direction][half-somersaults](+[half-twists])
 */

export type DiveGroup = 1 | 2 | 3 | 4 | 5 | 6;

export interface ParsedDive {
  code: string;
  group: DiveGroup;
  /** Underlying direction for twisting/armstand dives (1–4). */
  direction?: number;
  flying: boolean;
  halfSomersaults: number;
  halfTwists: number;
}

export interface ParseResult {
  ok: boolean;
  parsed?: ParsedDive;
  error?: string;
}

function digits(code: string): number[] | undefined {
  if (!/^[0-9]+$/.test(code)) return undefined;
  return [...code].map((d) => Number(d));
}

export function parseDiveCode(code: string): ParseResult {
  const ds = digits(code);
  if (!ds) return { ok: false, error: `code "${code}" is not numeric` };
  const group = ds[0];
  if (group === undefined || group < 1 || group > 6) {
    return { ok: false, error: `code "${code}" has invalid group digit` };
  }

  if (group >= 1 && group <= 4) {
    if (ds.length !== 3) return { ok: false, error: `group ${group} dive code must be 3 digits` };
    return {
      ok: true,
      parsed: {
        code,
        group: group as DiveGroup,
        flying: ds[1] === 1,
        halfSomersaults: ds[2]!,
        halfTwists: 0,
      },
    };
  }

  if (group === 5) {
    if (ds.length !== 4) return { ok: false, error: `twisting dive code must be 4 digits` };
    const direction = ds[1]!;
    if (direction < 1 || direction > 4) {
      return { ok: false, error: `twisting dive "${code}" has invalid direction digit` };
    }
    return {
      ok: true,
      parsed: { code, group: 5, direction, flying: false, halfSomersaults: ds[2]!, halfTwists: ds[3]! },
    };
  }

  // group === 6 (armstand)
  if (ds.length !== 3 && ds.length !== 4) {
    return { ok: false, error: `armstand dive code must be 3 or 4 digits` };
  }
  return {
    ok: true,
    parsed: {
      code,
      group: 6,
      direction: ds[1]!,
      flying: false,
      halfSomersaults: ds[2]!,
      halfTwists: ds.length === 4 ? ds[3]! : 0,
    },
  };
}
