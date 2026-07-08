import type { Category, Club, Competition, DiveSheet, Diver, Entry, Registration, Session, StartListItem } from '@aquameet/competition';
import type { Subscription } from '@aquameet/control-plane';
import type {
  CategoryStore,
  Collection,
  Database,
  DiverStore,
  EntryStore,
  RegistrationStore,
  SessionStore,
  SheetStore,
  StartListStore,
} from './types';

class MemoryCollection<T> implements Collection<T> {
  private readonly map = new Map<string, T>();

  async get(id: string): Promise<T | undefined> {
    return this.map.get(id);
  }
  async all(): Promise<T[]> {
    return [...this.map.values()];
  }
  async put(id: string, value: T): Promise<void> {
    this.map.set(id, value);
  }
  async remove(id: string): Promise<void> {
    this.map.delete(id);
  }
}

class MemoryDiverStore extends MemoryCollection<Diver> implements DiverStore {
  async byRegistration(registrationId: string): Promise<Diver[]> {
    return (await this.all()).filter((d) => d.registrationId === registrationId);
  }
}

class MemoryEntryStore extends MemoryCollection<Entry> implements EntryStore {
  async byCategory(categoryId: string): Promise<Entry[]> {
    return (await this.all()).filter((e) => e.categoryId === categoryId);
  }
  async byRegistration(registrationId: string): Promise<Entry[]> {
    return (await this.all()).filter((e) => e.registrationId === registrationId);
  }
}

class MemoryCategoryStore extends MemoryCollection<Category> implements CategoryStore {
  async byCompetition(competitionId: string): Promise<Category[]> {
    return (await this.all()).filter((c) => c.competitionId === competitionId);
  }
}

class MemorySessionStore extends MemoryCollection<Session> implements SessionStore {
  async byCompetition(competitionId: string): Promise<Session[]> {
    return (await this.all()).filter((s) => s.competitionId === competitionId);
  }
}

class MemoryStartListStore extends MemoryCollection<StartListItem> implements StartListStore {
  async byCategory(categoryId: string): Promise<StartListItem[]> {
    return (await this.all()).filter((s) => s.categoryId === categoryId).sort((a, b) => a.order - b.order);
  }
  async replaceForCategory(categoryId: string, items: StartListItem[]): Promise<void> {
    for (const s of await this.byCategory(categoryId)) await this.remove(s.id);
    for (const s of items) await this.put(s.id, s);
  }
}

class MemoryRegistrationStore extends MemoryCollection<Registration> implements RegistrationStore {
  async byToken(token: string): Promise<Registration | undefined> {
    return (await this.all()).find((r) => r.token === token);
  }
  async byCompetition(competitionId: string): Promise<Registration[]> {
    return (await this.all()).filter((r) => r.competitionId === competitionId);
  }
}

class MemorySheetStore implements SheetStore {
  private readonly map = new Map<string, DiveSheet>();

  async get(entryId: string): Promise<DiveSheet | undefined> {
    return this.map.get(entryId);
  }
  async put(sheet: DiveSheet): Promise<void> {
    this.map.set(sheet.entryId, sheet);
  }
}

/** In-memory Database — for tests, local dev and the venue hub's working set. */
export class InMemoryDatabase implements Database {
  readonly competitions = new MemoryCollection<Competition>();
  readonly registrations = new MemoryRegistrationStore();
  readonly clubs = new MemoryCollection<Club>();
  readonly divers = new MemoryDiverStore();
  readonly categories = new MemoryCategoryStore();
  readonly sessions = new MemorySessionStore();
  readonly startLists = new MemoryStartListStore();
  readonly entries = new MemoryEntryStore();
  readonly sheets = new MemorySheetStore();
  readonly subscriptions = new MemoryCollection<Subscription>();
}
