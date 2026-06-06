import type { Category, Club, DiveSheet, Diver, Entry } from '@aquameet/competition';
import type { Subscription } from '@aquameet/control-plane';
import type { Collection, Database, EntryStore, SheetStore } from '@aquameet/persistence';

/**
 * D1-backed implementation of the `@aquameet/persistence` Database contract.
 * Document-style storage: a JSON `data` column plus query columns. Lives here
 * (not in the pure package) because it needs Cloudflare Workers types.
 */
class D1Collection<T> implements Collection<T> {
  constructor(
    protected readonly db: D1Database,
    protected readonly table: string,
  ) {}

  async get(id: string): Promise<T | undefined> {
    const row = await this.db
      .prepare(`SELECT data FROM ${this.table} WHERE id = ?`)
      .bind(id)
      .first<{ data: string }>();
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  async all(): Promise<T[]> {
    const res = await this.db.prepare(`SELECT data FROM ${this.table}`).all<{ data: string }>();
    return res.results.map((r) => JSON.parse(r.data) as T);
  }

  async put(id: string, value: T): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ${this.table} (id, data) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      )
      .bind(id, JSON.stringify(value))
      .run();
  }

  async remove(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).bind(id).run();
  }
}

class D1EntryStore extends D1Collection<Entry> implements EntryStore {
  constructor(db: D1Database) {
    super(db, 'entries');
  }

  override async put(id: string, value: Entry): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO entries (id, category_id, data) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, data = excluded.data`,
      )
      .bind(id, value.categoryId, JSON.stringify(value))
      .run();
  }

  async byCategory(categoryId: string): Promise<Entry[]> {
    const res = await this.db
      .prepare('SELECT data FROM entries WHERE category_id = ?')
      .bind(categoryId)
      .all<{ data: string }>();
    return res.results.map((r) => JSON.parse(r.data) as Entry);
  }
}

class D1SheetStore implements SheetStore {
  constructor(private readonly db: D1Database) {}

  async get(entryId: string): Promise<DiveSheet | undefined> {
    const row = await this.db
      .prepare('SELECT data FROM sheets WHERE entry_id = ?')
      .bind(entryId)
      .first<{ data: string }>();
    return row ? (JSON.parse(row.data) as DiveSheet) : undefined;
  }

  async put(sheet: DiveSheet): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sheets (entry_id, data) VALUES (?, ?)
         ON CONFLICT(entry_id) DO UPDATE SET data = excluded.data`,
      )
      .bind(sheet.entryId, JSON.stringify(sheet))
      .run();
  }
}

export class D1AppDatabase implements Database {
  readonly clubs: Collection<Club>;
  readonly divers: Collection<Diver>;
  readonly categories: Collection<Category>;
  readonly entries: EntryStore;
  readonly sheets: SheetStore;
  readonly subscriptions: Collection<Subscription>;

  constructor(db: D1Database) {
    this.clubs = new D1Collection<Club>(db, 'clubs');
    this.divers = new D1Collection<Diver>(db, 'divers');
    this.categories = new D1Collection<Category>(db, 'categories');
    this.entries = new D1EntryStore(db);
    this.sheets = new D1SheetStore(db);
    this.subscriptions = new D1Collection<Subscription>(db, 'subscriptions');
  }
}
