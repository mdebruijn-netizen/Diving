import type { Category, Club, Competition, DiveSheet, Diver, Entry, Registration, Session, StartListItem } from '@aquameet/competition';
import type { Subscription } from '@aquameet/control-plane';

/**
 * Storage interfaces (plan Deel 2 §E). Async by design so the same `Database`
 * contract is satisfied by the in-memory store (tested here) and a D1-backed
 * adapter at the edge (apps/api). Each tenant gets its own database.
 */
export interface Collection<T> {
  get(id: string): Promise<T | undefined>;
  all(): Promise<T[]>;
  put(id: string, value: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface DiverStore extends Collection<Diver> {
  /** Divers added under a self-service registration. */
  byRegistration(registrationId: string): Promise<Diver[]>;
}

export interface EntryStore extends Collection<Entry> {
  /** Entries belonging to a category (the running order's result class). */
  byCategory(categoryId: string): Promise<Entry[]>;
  /** Entries created under a self-service registration. */
  byRegistration(registrationId: string): Promise<Entry[]>;
}

export interface CategoryStore extends Collection<Category> {
  /** Categories belonging to a competition. */
  byCompetition(competitionId: string): Promise<Category[]>;
}

export interface SessionStore extends Collection<Session> {
  /** Sessions belonging to a competition. */
  byCompetition(competitionId: string): Promise<Session[]>;
}

export interface StartListStore extends Collection<StartListItem> {
  /** Running-order items for a category. */
  byCategory(categoryId: string): Promise<StartListItem[]>;
  /** Replace a category's running order in one shot (idempotent regeneration). */
  replaceForCategory(categoryId: string, items: StartListItem[]): Promise<void>;
}

export interface RegistrationStore extends Collection<Registration> {
  /** Look up a registration by its magic-link token. */
  byToken(token: string): Promise<Registration | undefined>;
  /** Registrations for a competition. */
  byCompetition(competitionId: string): Promise<Registration[]>;
}

export interface SheetStore {
  get(entryId: string): Promise<DiveSheet | undefined>;
  put(sheet: DiveSheet): Promise<void>;
}

export interface Database {
  competitions: Collection<Competition>;
  registrations: RegistrationStore;
  clubs: Collection<Club>;
  divers: DiverStore;
  categories: CategoryStore;
  sessions: SessionStore;
  startLists: StartListStore;
  entries: EntryStore;
  sheets: SheetStore;
  /** Subscriptions keyed by tenantId. */
  subscriptions: Collection<Subscription>;
}
