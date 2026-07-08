import { Hono } from 'hono';
import type { Diver, Entry, Registration } from '@aquameet/competition';
import { isDiverEligible } from '@aquameet/competition';
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

/** Public schedule for a competition: ordered sessions, categories and start lists. */
publicRoutes.get('/competitions/:id/schedule', async (c) => {
  const d = db(c);
  const competition = await d.competitions.get(c.req.param('id'));
  if (!competition) return c.notFound();
  const [sessions, categories, divers] = await Promise.all([
    d.sessions.byCompetition(competition.id),
    d.categories.byCompetition(competition.id),
    d.divers.all(),
  ]);
  const diverName = new Map(divers.map((v) => [v.id, `${v.firstName} ${v.lastName}`]));
  const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

  // Resolve each category's running order (start list) to ordered diver names.
  const withStartList = async (cat: (typeof categories)[number]) => {
    const [items, entries] = await Promise.all([d.startLists.byCategory(cat.id), d.entries.byCategory(cat.id)]);
    const diverByEntry = new Map(entries.map((e) => [e.id, e.diverId]));
    const startList = items.map((it) => diverName.get(diverByEntry.get(it.entryId) ?? '') ?? 'Unknown').filter(Boolean);
    return { ...cat, startList };
  };
  const decorate = (cats: typeof categories) => Promise.all([...cats].sort(byOrder).map(withStartList));

  const schedule = await Promise.all(
    [...sessions].sort(byOrder).map(async (s) => ({
      session: s,
      categories: await decorate(categories.filter((cat) => cat.sessionId === s.id)),
    })),
  );
  const unscheduled = await decorate(categories.filter((cat) => !cat.sessionId));
  return c.json({
    competition: { id: competition.id, name: competition.name, date: competition.date, endDate: competition.endDate, location: competition.location },
    schedule,
    unscheduled,
  });
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
  const category = await d.categories.get(body.categoryId);
  if (!category) return c.json({ error: 'bad_category' }, 400);
  // Enforce the age-group floor: a diver may enter their own or an older group, never a younger one.
  if (!isDiverEligible(diver.birthYear, category)) return c.json({ error: 'age_not_eligible' }, 400);
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

publicRoutes.post('/registration/:token/reopen', async (c) => {
  const reg = await db(c).registrations.byToken(c.req.param('token'));
  if (!reg) return c.notFound();
  await db(c).registrations.put(reg.id, { ...reg, status: 'open' });
  return c.json({ ok: true });
});
