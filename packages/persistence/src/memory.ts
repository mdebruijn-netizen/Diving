import type { Category, Club, DiveSheet, Diver, Entry } from '@aquameet/competition';
import type { Subscription } from '@aquameet/control-plane';
import type { Collection, Database, EntryStore, SheetStore } from './types';

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

class MemoryEntryStore extends MemoryCollection<Entry> implements EntryStore {
  async byCategory(categoryId: string): Promise<Entry[]> {
    return (await this.all()).filter((e) => e.categoryId === categoryId);
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
  readonly clubs = new MemoryCollection<Club>();
  readonly divers = new MemoryCollection<Diver>();
  readonly categories = new MemoryCollection<Category>();
  readonly entries = new MemoryEntryStore();
  readonly sheets = new MemorySheetStore();
  readonly subscriptions = new MemoryCollection<Subscription>();
}
