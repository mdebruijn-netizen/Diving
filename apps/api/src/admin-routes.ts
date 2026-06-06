import { Hono } from 'hono';
import type { Category, DiveSheet, Entry } from '@aquameet/competition';
import { D1AppDatabase } from './d1-database';
import type { Env } from './env';

/**
 * Admin/competition CRUD over the tenant database. Thin handlers over the
 * `@aquameet/persistence` Database contract (D1-backed here).
 */
export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.get('/categories', async (c) => {
  const db = new D1AppDatabase(c.env.DB);
  return c.json(await db.categories.all());
});

adminRoutes.put('/categories/:id', async (c) => {
  const db = new D1AppDatabase(c.env.DB);
  await db.categories.put(c.req.param('id'), await c.req.json<Category>());
  return c.json({ ok: true });
});

adminRoutes.get('/categories/:id/entries', async (c) => {
  const db = new D1AppDatabase(c.env.DB);
  return c.json(await db.entries.byCategory(c.req.param('id')));
});

adminRoutes.put('/entries/:id', async (c) => {
  const db = new D1AppDatabase(c.env.DB);
  await db.entries.put(c.req.param('id'), await c.req.json<Entry>());
  return c.json({ ok: true });
});

adminRoutes.get('/sheets/:entryId', async (c) => {
  const db = new D1AppDatabase(c.env.DB);
  const sheet = await db.sheets.get(c.req.param('entryId'));
  return sheet ? c.json(sheet) : c.notFound();
});

adminRoutes.put('/sheets/:entryId', async (c) => {
  const db = new D1AppDatabase(c.env.DB);
  await db.sheets.put(await c.req.json<DiveSheet>());
  return c.json({ ok: true });
});
