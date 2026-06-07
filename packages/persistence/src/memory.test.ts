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

  it('stores competitions and queries categories by competition', async () => {
    const db = new InMemoryDatabase();
    await db.competitions.put('w1', { id: 'w1', name: 'Voorjaar', date: '2026-04-01' });
    expect((await db.competitions.get('w1'))?.name).toBe('Voorjaar');
    await db.categories.put('c1', { ...category('c1'), competitionId: 'w1' });
    await db.categories.put('c2', { ...category('c2'), competitionId: 'w9' });
    const inW1 = await db.categories.byCompetition('w1');
    expect(inW1.map((c) => c.id)).toEqual(['c1']);
  });

  it('stores registrations and scopes divers/entries by registration', async () => {
    const db = new InMemoryDatabase();
    await db.registrations.put('r1', {
      id: 'r1', competitionId: 'w1', contactName: 'Coach', contactEmail: 'c@x.nl',
      token: 'tok-abc', status: 'open', createdAt: '2026-01-01',
    });
    expect((await db.registrations.byToken('tok-abc'))?.id).toBe('r1');
    expect((await db.registrations.byCompetition('w1')).map((r) => r.id)).toEqual(['r1']);

    await db.divers.put('d1', { id: 'd1', firstName: 'A', lastName: 'B', gender: 'F', birthYear: 2012, clubId: '', registrationId: 'r1' });
    await db.divers.put('d2', { id: 'd2', firstName: 'C', lastName: 'D', gender: 'M', birthYear: 2011, clubId: '' });
    expect((await db.divers.byRegistration('r1')).map((d) => d.id)).toEqual(['d1']);

    await db.entries.put('e1', { id: 'e1', diverId: 'd1', categoryId: 'c1', registrationId: 'r1' });
    expect((await db.entries.byRegistration('r1')).map((e) => e.id)).toEqual(['e1']);
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
