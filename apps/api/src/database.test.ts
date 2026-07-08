import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { SCHEMA_SQL } from '@aquameet/persistence';
import { D1AppDatabase } from './d1-database';
import { AuthStore } from './auth-store';

/**
 * Database integration guard. Runs the REAL production SQL — the canonical
 * schema, every migration file, and the D1 adapter / AuthStore queries — against
 * an in-process SQLite (node:sqlite) so invalid SQL, missing tables/columns and
 * schema↔migration drift fail CI instead of a live meet.
 */

// Minimal shim mapping node:sqlite's DatabaseSync onto the D1Database surface
// the adapter uses: prepare().bind().first()/all()/run().
class ShimStatement {
  constructor(
    private readonly stmt: StatementSync,
    private readonly params: unknown[] = [],
  ) {}
  bind(...args: unknown[]) {
    return new ShimStatement(this.stmt, args);
  }
  async first<T>(): Promise<T | null> {
    return (this.stmt.get(...(this.params as never[])) as T) ?? null;
  }
  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.stmt.all(...(this.params as never[])) as T[] };
  }
  async run() {
    return this.stmt.run(...(this.params as never[]));
  }
}
class ShimDatabase {
  constructor(private readonly db: DatabaseSync) {}
  prepare(sql: string) {
    return new ShimStatement(this.db.prepare(sql));
  }
}

function fresh(sql: string): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(sql);
  return db;
}
const asD1 = (db: DatabaseSync) => new ShimDatabase(db) as unknown as D1Database;

const tablesOf = (db: DatabaseSync): string[] =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[])
    .map((r) => r.name)
    .sort();

const migrationDir = new URL('../migrations/', import.meta.url);
const migrationSql = () =>
  readdirSync(migrationDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(new URL(f, migrationDir), 'utf8'));

describe('database schema & migrations', () => {
  it('the canonical schema applies cleanly', () => {
    expect(() => fresh(SCHEMA_SQL)).not.toThrow();
  });

  it('every migration is valid SQL and idempotent', () => {
    const db = new DatabaseSync(':memory:');
    const sql = migrationSql();
    expect(() => {
      for (const m of sql) db.exec(m);
      for (const m of sql) db.exec(m); // re-apply → must be IF NOT EXISTS-safe
    }).not.toThrow();
  });

  it('migrations and the mirrored schema define the same tables (no drift)', () => {
    const fromSchema = tablesOf(fresh(SCHEMA_SQL));
    const migDb = new DatabaseSync(':memory:');
    for (const m of migrationSql()) migDb.exec(m);
    expect(tablesOf(migDb)).toEqual(fromSchema);
  });
});

describe('D1 adapter queries (real SQL over SQLite)', () => {
  it('exercises every store: put/get/all and the by-* filters', async () => {
    const db = new D1AppDatabase(asD1(fresh(SCHEMA_SQL)));

    await db.competitions.put('w1', { id: 'w1', name: 'Open', date: '2026-04-01', organizationId: 'org1' });
    expect((await db.competitions.get('w1'))?.name).toBe('Open');
    expect(await db.competitions.all()).toHaveLength(1);

    await db.categories.put('c1', { id: 'c1', name: 'E-3m', gender: 'M', ageGroup: 'E', disciplineId: 'springboard-3m', rules: { diveCount: 6 }, competitionId: 'w1', sessionId: 's1', order: 0 });
    await db.categories.put('c2', { id: 'c2', name: 'D-3m', gender: 'F', ageGroup: 'D', disciplineId: 'springboard-3m', rules: { diveCount: 6 }, competitionId: 'w9' });
    expect((await db.categories.byCompetition('w1')).map((c) => c.id)).toEqual(['c1']);

    await db.sessions.put('s1', { id: 's1', competitionId: 'w1', name: 'Morning', order: 0 });
    expect((await db.sessions.byCompetition('w1')).map((s) => s.id)).toEqual(['s1']);

    await db.divers.put('d1', { id: 'd1', firstName: 'Elliot', lastName: 'de Bruijn', gender: 'M', birthYear: 2017, clubId: '', registrationId: 'r1' });
    expect((await db.divers.byRegistration('r1')).map((d) => d.id)).toEqual(['d1']);

    await db.registrations.put('r1', { id: 'r1', competitionId: 'w1', contactName: 'Coach', contactEmail: 'c@x.nl', token: 'tok-1', status: 'open', createdAt: '2026-01-01' });
    expect((await db.registrations.byToken('tok-1'))?.id).toBe('r1');
    expect((await db.registrations.byCompetition('w1')).map((r) => r.id)).toEqual(['r1']);

    await db.entries.put('e1', { id: 'e1', diverId: 'd1', categoryId: 'c1', registrationId: 'r1' });
    expect((await db.entries.byCategory('c1')).map((e) => e.id)).toEqual(['e1']);
    expect((await db.entries.byRegistration('r1')).map((e) => e.id)).toEqual(['e1']);

    await db.startLists.replaceForCategory('c1', [{ id: 'sl1', categoryId: 'c1', entryId: 'e1', order: 0 }]);
    expect((await db.startLists.byCategory('c1')).map((s) => s.entryId)).toEqual(['e1']);
    // replace is idempotent — no duplicate rows
    await db.startLists.replaceForCategory('c1', [{ id: 'sl2', categoryId: 'c1', entryId: 'e1', order: 0 }]);
    expect(await db.startLists.byCategory('c1')).toHaveLength(1);

    await db.sheets.put({ entryId: 'e1', dives: [{ code: '5253', position: 'B' }] });
    expect((await db.sheets.get('e1'))?.dives).toHaveLength(1);

    await db.subscriptions.put('org1', { tenantId: 'org1', planId: 'free', status: 'active', currentPeriodEnd: '2126-01-01T00:00:00.000Z' });
    expect((await db.subscriptions.get('org1'))?.planId).toBe('free');
  });

  it('exercises the AuthStore queries (accounts, orgs, tokens)', async () => {
    const store = new AuthStore(asD1(fresh(SCHEMA_SQL)));
    await store.createOrganization({ id: 'org1', name: 'Diving Club', createdAt: '2026-01-01' });
    expect((await store.getOrganization('org1'))?.name).toBe('Diving Club');

    await store.createAccount({ id: 'a1', organizationId: 'org1', email: 'coach@club.nl', role: 'org_admin', createdAt: '2026-01-01' });
    expect((await store.getAccountByEmail('coach@club.nl'))?.id).toBe('a1');
    expect((await store.getAccount('a1'))?.email).toBe('coach@club.nl');

    await store.putToken({ token: 't1', accountId: 'a1', organizationId: 'org1', kind: 'session', expiresAt: '2126-01-01', createdAt: '2026-01-01' });
    expect((await store.getToken('t1'))?.accountId).toBe('a1');
    await store.deleteToken('t1');
    expect(await store.getToken('t1')).toBeUndefined();
  });
});
