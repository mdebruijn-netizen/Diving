import { Hono } from 'hono';
import type { Category, Competition, DiveSheet, Diver, Entry } from '@aquameet/competition';
import { D1AppDatabase } from './d1-database';
import type { Env } from './env';

/**
 * Admin/competition CRUD over the tenant database (D1-backed). Thin handlers
 * over the @aquameet/persistence Database contract.
 *
 * NOTE: these are currently unauthenticated (preview). Real organizer auth is
 * the next step and will guard this router.
 */
export const adminRoutes = new Hono<{ Bindings: Env }>();

const db = (c: { env: Env }) => new D1AppDatabase(c.env.DB);

/* ---------- Competitions ---------- */
adminRoutes.get('/competitions', async (c) => c.json(await db(c).competitions.all()));
adminRoutes.get('/competitions/:id', async (c) => {
  const item = await db(c).competitions.get(c.req.param('id'));
  return item ? c.json(item) : c.notFound();
});
adminRoutes.put('/competitions/:id', async (c) => {
  await db(c).competitions.put(c.req.param('id'), await c.req.json<Competition>());
  return c.json({ ok: true });
});
adminRoutes.delete('/competitions/:id', async (c) => {
  await db(c).competitions.remove(c.req.param('id'));
  return c.json({ ok: true });
});

/* ---------- Categories ---------- */
adminRoutes.get('/categories', async (c) => {
  const competitionId = c.req.query('competitionId');
  const store = db(c).categories;
  return c.json(competitionId ? await store.byCompetition(competitionId) : await store.all());
});
adminRoutes.put('/categories/:id', async (c) => {
  await db(c).categories.put(c.req.param('id'), await c.req.json<Category>());
  return c.json({ ok: true });
});
adminRoutes.delete('/categories/:id', async (c) => {
  await db(c).categories.remove(c.req.param('id'));
  return c.json({ ok: true });
});

/* ---------- Divers ---------- */
adminRoutes.get('/divers', async (c) => c.json(await db(c).divers.all()));
adminRoutes.put('/divers/:id', async (c) => {
  await db(c).divers.put(c.req.param('id'), await c.req.json<Diver>());
  return c.json({ ok: true });
});
adminRoutes.delete('/divers/:id', async (c) => {
  await db(c).divers.remove(c.req.param('id'));
  return c.json({ ok: true });
});

/* ---------- Entries ---------- */
adminRoutes.get('/categories/:id/entries', async (c) => c.json(await db(c).entries.byCategory(c.req.param('id'))));
adminRoutes.put('/entries/:id', async (c) => {
  await db(c).entries.put(c.req.param('id'), await c.req.json<Entry>());
  return c.json({ ok: true });
});

/* ---------- Dive sheets ---------- */
adminRoutes.get('/sheets/:entryId', async (c) => {
  const sheet = await db(c).sheets.get(c.req.param('entryId'));
  return sheet ? c.json(sheet) : c.notFound();
});
adminRoutes.put('/sheets/:entryId', async (c) => {
  await db(c).sheets.put(await c.req.json<DiveSheet>());
  return c.json({ ok: true });
});
