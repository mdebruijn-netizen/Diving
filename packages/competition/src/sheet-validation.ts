import type { CategoryRules, DiveListItem, DiveSheet } from './entities';
import { parseDiveCode } from './dive-code';

export type IssueCode =
  | 'WRONG_DIVE_COUNT'
  | 'UNKNOWN_DIVE'
  | 'INVALID_CODE'
  | 'DUPLICATE_DIVE'
  | 'INSUFFICIENT_GROUPS'
  | 'DD_LIMIT_EXCEEDED';

export interface ValidationIssue {
  code: IssueCode;
  message: string;
  /** Index into the dive list, when the issue is dive-specific. */
  diveIndex?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Sum of resolved DDs (for resolved dives). */
  totalDd: number;
}

/**
 * Resolve the Degree of Difficulty for a dive, or `undefined` if it is not a
 * valid dive for this category. Wire this to `lookupDd` against the category's
 * discipline; injected so the validator stays decoupled from a specific pack.
 */
export type DdResolver = (item: DiveListItem) => number | undefined;

/**
 * Validate a dive sheet against a category's rules (plan Deel 3 §K). Authoritative
 * dive validity is "does the dive exist in the DD catalogue" (via {@link DdResolver});
 * the rest are structural/category rules. Returns every issue, not just the first,
 * so a coach can fix the whole sheet at once.
 */
export function validateDiveSheet(
  sheet: DiveSheet,
  rules: CategoryRules,
  resolveDd: DdResolver,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (sheet.dives.length !== rules.diveCount) {
    issues.push({
      code: 'WRONG_DIVE_COUNT',
      message: `expected ${rules.diveCount} dives, got ${sheet.dives.length}`,
    });
  }

  const groups = new Set<number>();
  const seen = new Set<string>();
  let totalDd = 0;

  sheet.dives.forEach((item, index) => {
    const parsed = parseDiveCode(item.code);
    if (!parsed.ok) {
      issues.push({ code: 'INVALID_CODE', message: parsed.error ?? 'invalid code', diveIndex: index });
    } else {
      groups.add(parsed.parsed!.group);
    }

    const key = `${item.code}${item.position}`;
    if (seen.has(key) && rules.allowSameDiveTwice !== true) {
      issues.push({ code: 'DUPLICATE_DIVE', message: `dive ${key} appears more than once`, diveIndex: index });
    }
    seen.add(key);

    const dd = resolveDd(item);
    if (dd === undefined) {
      issues.push({ code: 'UNKNOWN_DIVE', message: `${key} is not a valid dive for this category`, diveIndex: index });
    } else {
      totalDd += dd;
    }
  });

  if (rules.requireDistinctGroups !== undefined && groups.size < rules.requireDistinctGroups) {
    issues.push({
      code: 'INSUFFICIENT_GROUPS',
      message: `requires ${rules.requireDistinctGroups} distinct groups, sheet covers ${groups.size}`,
    });
  }

  if (rules.maxTotalDd !== undefined && round2(totalDd) > rules.maxTotalDd) {
    issues.push({
      code: 'DD_LIMIT_EXCEEDED',
      message: `total DD ${round2(totalDd)} exceeds limit ${rules.maxTotalDd}`,
    });
  }

  return { valid: issues.length === 0, issues, totalDd: round2(totalDd) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
