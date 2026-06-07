import { Hono } from 'hono';
import type { Diver, Entry, Registration } from '@aquameet/competition';
import { D1AppDatabase } from './d1-database';
import type { Env } from './env';

/**
 * Public, token-scoped self-registration API. No organizer auth: a contact
 * registers for an open competition and receives a magic-link token that grants
 * access to *their* registration only (divers + dive sheets). Accounts can be
 * layered on later without changing this surface.
 */
export const publicRoutes = new Hono<{ Bindings: Env }>();

const db = (c: { env: Env }) => new D1AppDatabase(c.env.DB);

function makeToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
}

/** Competitions currently open for self-registration (minimal public fields). */
publicRoutes.get('/competitions', async (c) => {
  const all = await db(c).competitions.all();
  return c.json(
    all
      .filter((w) => w.registrationOpen)
      .map((w) => ({ id: w.id, name: w.name, date: w.date, endDate: w.endDate, location: w.location, registrationDeadline: w.registrationDeadline })),
  );
});

/** Create a registration; returns the magic-link token (shown to the user in dev mode). */
publicRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ competitionId: string; contactName: string; contactEmail: string; clubName?: string }>();
  const competition = await db(c).competitions.get(body.competitionId);
  if (!competition || !competition.registrationOpen) return c.json({ error: 'registration_closed' }, 400);
  if (!body.contactEmail?.trim() || !body.contactName?.trim()) return c.json({ error: 'missing_contact' }, 400);

  const reg: Registration = {
    id: crypto.randomUUID(),
    competitionId: body.competitionId,
    contactName: body.contactName.trim(),
    contactEmail: body.contactEmail.trim(),
    clubName: body.clubName?.trim() || undefined,
    token: makeToken(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  await db(c).registrations.put(reg.id, reg);
  return c.json({ token: reg.token });
});

/** Load a registration by token, with everything needed to manage it. */
publicRoutes.get('/registration/:token', async (c) => {
  const d = db(c);
  const reg = await d.registrations.byToken(c.req.param('token'));
  if (!reg) return c.notFound();
  const [competition, categories, divers, entries] = await Promise.all([
    d.competitions.get(reg.competitionId),
    d.categories.byCompetition(reg.competitionId),
    d.divers.byRegistration(reg.id),
    d.entries.byRegistration(reg.id),
  ]);
  const sheets = Object.fromEntries(
    (await Promise.all(entries.map(async (e) => [e.id, await d.sheets.get(e.id)] as const))).filter(([, s]) => s),
  );
  return c.json({ registration: reg, competition, categories, divers, entries, sheets });
});

/** Resolve the registration for a token, enforcing it's editable. */
async function editable(c: { env: Env; req: { param(name: string): string } }) {
  const reg = await db(c).registrations.byToken(c.req.param('token'));
  if (!reg) return { error: 'not_found' as const };
  if (reg.status === 'submitted') return { error: 'locked' as const, reg };
  return { reg };
}

publicRoutes.post('/registration/:token/divers', async (c) => {
  const r = await editable(c);
  if (r.error === 'not_found') return c.notFound();
  if (r.error === 'locked') return c.json({ error: 'locked' }, 409);
  const body = await c.req.json<Omit<Diver, 'id' | 'registrationId'>>();
  const diver: Diver = { ...body, id: crypto.randomUUID(), clubId: body.clubId || r.reg.clubName || '', registrationId: r.reg.id };
  await db(c).divers.put(diver.id, diver);
  return c.json(diver);
});

publicRoutes.delete('/registration/:token/divers/:id', async (c) => {
  const r = await editable(c);
  if (r.error === 'not_found') return c.notFound();
  if (r.error === 'locked') return c.json({ error: 'locked' }, 409);
  const d = db(c);
  const diver = await d.divers.get(c.req.param('id'));
  if (!diver || diver.registrationId !== r.reg.id) return c.notFound();
  const entries = (await d.entries.byRegistration(r.reg.id)).filter((e) => e.diverId === diver.id);
  await Promise.all(entries.map((e) => d.entries.remove(e.id)));
  await d.divers.remove(diver.id);
  return c.json({ ok: true });
});

publicRoutes.put('/registration/:token/entries/:entryId', async (c) => {
  const r = await editable(c);
  if (r.error === 'not_found') return c.notFound();
  if (r.error === 'locked') return c.json({ error: 'locked' }, 409);
  const d = db(c);
  const body = await c.req.json<{ diverId: string; categoryId: string }>();
  const diver = await d.divers.get(body.diverId);
  if (!diver || diver.registrationId !== r.reg.id) return c.json({ error: 'bad_diver' }, 400);
  const entry: Entry = { id: c.req.param('entryId'), diverId: body.diverId, categoryId: body.categoryId, registrationId: r.reg.id };
  await d.entries.put(entry.id, entry);
  return c.json(entry);
});

publicRoutes.delete('/registration/:token/entries/:entryId', async (c) => {
  const r = await editable(c);
  if (r.error === 'not_found') return c.notFound();
  if (r.error === 'locked') return c.json({ error: 'locked' }, 409);
  const d = db(c);
  const entry = await d.entries.get(c.req.param('entryId'));
  if (!entry || entry.registrationId !== r.reg.id) return c.notFound();
  await d.entries.remove(entry.id);
  return c.json({ ok: true });
});

publicRoutes.put('/registration/:token/sheets/:entryId', async (c) => {
  const r = await editable(c);
  if (r.error === 'not_found') return c.notFound();
  if (r.error === 'locked') return c.json({ error: 'locked' }, 409);
  const d = db(c);
  const entryId = c.req.param('entryId');
  const entry = await d.entries.get(entryId);
  if (!entry || entry.registrationId !== r.reg.id) return c.json({ error: 'bad_entry' }, 400);
  const body = await c.req.json<{ dives: { code: string; position: string }[] }>();
  await d.sheets.put({ entryId, dives: body.dives as never });
  return c.json({ ok: true });
});

publicRoutes.post('/registration/:token/submit', async (c) => {
  const reg = await db(c).registrations.byToken(c.req.param('token'));
  if (!reg) return c.notFound();
  await db(c).registrations.put(reg.id, { ...reg, status: 'submitted' });
  return c.json({ ok: true });
});
