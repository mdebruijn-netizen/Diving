import type { Category, Club, Competition, DiveSheet, Diver, Entry } from '@aquameet/competition';
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

export interface EntryStore extends Collection<Entry> {
  /** Entries belonging to a category (the running order's result class). */
  byCategory(categoryId: string): Promise<Entry[]>;
}

export interface CategoryStore extends Collection<Category> {
  /** Categories belonging to a competition. */
  byCompetition(competitionId: string): Promise<Category[]>;
}

export interface SheetStore {
  get(entryId: string): Promise<DiveSheet | undefined>;
  put(sheet: DiveSheet): Promise<void>;
}

export interface Database {
  competitions: Collection<Competition>;
  clubs: Collection<Club>;
  divers: Collection<Diver>;
  categories: CategoryStore;
  entries: EntryStore;
  sheets: SheetStore;
  /** Subscriptions keyed by tenantId. */
  subscriptions: Collection<Subscription>;
}
