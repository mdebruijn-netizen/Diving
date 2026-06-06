import { describe, it, expect } from 'vitest';
import type { Category, Entry } from '@aquameet/competition';
import type { Subscription } from '@aquameet/control-plane';
import { InMemoryDatabase } from './memory';

function category(id: string): Category {
  return { id, name: id, gender: 'M', ageGroup: 'Open', disciplineId: 'springboard-3m', rules: { diveCount: 6 } };
}
const entry = (id: string, categoryId: string): Entry => ({ id, diverId: `d-${id}`, categoryId });

describe('InMemoryDatabase', () => {
  it('stores, reads, lists and removes entities', async () => {
    const db = new InMemoryDatabase();
    await db.categories.put('c1', category('c1'));
    expect(await db.categories.get('c1')).toMatchObject({ id: 'c1' });
    expect(await db.categories.all()).toHaveLength(1);
    await db.categories.remove('c1');
    expect(await db.categories.get('c1')).toBeUndefined();
  });

  it('queries entries by category', async () => {
    const db = new InMemoryDatabase();
    await db.entries.put('e1', entry('e1', 'cat-A'));
    await db.entries.put('e2', entry('e2', 'cat-A'));
    await db.entries.put('e3', entry('e3', 'cat-B'));
    const inA = await db.entries.byCategory('cat-A');
    expect(inA.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
  });

  it('stores a dive sheet keyed by entry id', async () => {
    const db = new InMemoryDatabase();
    await db.sheets.put({ entryId: 'e1', dives: [{ code: '101', position: 'B' }] });
    expect((await db.sheets.get('e1'))?.dives).toHaveLength(1);
    expect(await db.sheets.get('missing')).toBeUndefined();
  });

  it('keys subscriptions by tenant id', async () => {
    const db = new InMemoryDatabase();
    const sub: Subscription = { tenantId: 't1', planId: 'competition_pro', status: 'active', currentPeriodEnd: '2026-07-01T00:00:00.000Z' };
    await db.subscriptions.put(sub.tenantId, sub);
    expect((await db.subscriptions.get('t1'))?.planId).toBe('competition_pro');
  });
});
