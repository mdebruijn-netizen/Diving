import type { DivePosition } from '@aquameet/rule-packs';

/**
 * Competition domain entities (plan Deel 2 §I). A physical {@link Session} runs
 * one or more {@link Category} result classes — this is how mixed boys+girls
 * runs work: divers share a running order but are ranked within their category.
 */

export type Gender = 'M' | 'F' | 'X';

export interface Club {
  id: string;
  name: string;
  country?: string;
}

export interface Diver {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthYear: number;
  clubId: string;
}

/** Rules a dive sheet must satisfy for a category (federation/age-group data). */
export interface CategoryRules {
  /** Required number of dives on the sheet. */
  diveCount: number;
  /** Optional cap on the summed Degree of Difficulty (a "voluntary"/limited round). */
  maxTotalDd?: number;
  /** Minimum number of distinct dive groups that must be represented. */
  requireDistinctGroups?: number;
  /** Whether the same dive (code+position) may appear more than once. */
  allowSameDiveTwice?: boolean;
}

export interface Category {
  id: string;
  name: string;
  gender: Gender;
  /** Age-group label, e.g. "12-13" or "Open". */
  ageGroup: string;
  /** Discipline key matching the RulePack DD table, e.g. "springboard-3m". */
  disciplineId: string;
  rules: CategoryRules;
}

export interface DiveListItem {
  code: string;
  position: DivePosition;
}

export interface DiveSheet {
  entryId: string;
  dives: DiveListItem[];
}

export interface Entry {
  id: string;
  diverId: string;
  categoryId: string;
}
