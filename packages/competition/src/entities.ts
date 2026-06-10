import type { DivePosition } from '@aquameet/rule-packs';

/**
 * Competition domain entities (plan Deel 2 §I). A physical {@link Session} runs
 * one or more {@link Category} result classes — this is how mixed boys+girls
 * runs work: divers share a running order but are ranked within their category.
 */

export type Gender = 'M' | 'F' | 'X';

/** A competition (the umbrella event), grouping one or more categories/sessions. */
export interface Competition {
  id: string;
  name: string;
  /** ISO start date (YYYY-MM-DD). Single-day meets only set this. */
  date: string;
  /** ISO end date (YYYY-MM-DD) for multi-day meets; omit/equal to `date` for one day. */
  endDate?: string;
  location?: string;
  /** Whether clubs/divers can self-register for this competition. */
  registrationOpen?: boolean;
  /** Optional ISO date after which self-registration locks. */
  registrationDeadline?: string;
  /** Owning organisation (tenant). Legacy rows may omit this. */
  organizationId?: string;
  /** Public meets are listed/indexable; private meets are link/code only. */
  isPublic?: boolean;
}

/**
 * A self-service registration: one contact (a club, coach or parent) signs up
 * for a competition and manages one or more divers + their dive sheets via a
 * magic-link token — no account required (accounts can be layered on later).
 */
export interface Registration {
  id: string;
  competitionId: string;
  contactName: string;
  contactEmail: string;
  clubName?: string;
  /** Opaque secret embedded in the magic link; grants access to this registration only. */
  token: string;
  /** 'open' while editable; 'submitted' once locked in by the contact. */
  status: 'open' | 'submitted';
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  country?: string;
}

/**
 * A scheduling block within a competition (e.g. "Morning session"). Categories
 * are assigned to a session and ordered to form the running order / schedule.
 */
export interface Session {
  id: string;
  competitionId: string;
  name: string;
  /** ISO date (YYYY-MM-DD); defaults to the competition date when omitted. */
  date?: string;
  /** Local start time, e.g. "09:00". */
  startTime?: string;
  /** Local warm-up time, e.g. "08:00". */
  warmUpTime?: string;
  /** Position of this session within the competition. */
  order: number;
}

export interface Diver {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthYear: number;
  clubId: string;
  /** Set when the diver was added via a self-service registration. */
  registrationId?: string;
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
  /** Competition this category belongs to. */
  competitionId?: string;
  /** Session this category runs in (scheduling); unscheduled when omitted. */
  sessionId?: string;
  /** Position within its session's running order. */
  order?: number;
  /**
   * Birth-year band for this group. `minBirthYear` is the earliest year (the
   * oldest children); `maxBirthYear` the latest (the youngest). A diver may
   * enter their own band or an older/harder one, never a younger/easier one —
   * so eligibility is `diver.birthYear >= minBirthYear`. Omit for no age limit.
   */
  minBirthYear?: number;
  maxBirthYear?: number;
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
  /** Set when the entry was created via a self-service registration. */
  registrationId?: string;
}
