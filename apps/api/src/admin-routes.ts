import { Hono } from 'hono';
import type { Category, Competition, DiveSheet, Diver, Entry, Session } from '@aquameet/competition';
import { buildEntitlementDoc, planFor, resolvePlanId, type Subscription } from '@aquameet/control-plane';
import { signEntitlement, type EntitlementDoc, type SignedEntitlement } from '@aquameet/entitlements';
import { D1AppDatabase } from './d1-database';
import { AuthStore } from './auth-store';
import { requireAuth } from './auth-routes';
import type { Env, Vars } from './env';

/**
 * Admin/competition CRUD over the tenant database. Guarded by {@link requireAuth}
 * so every handler has an organisation context; competition data is scoped to
 * the caller's organisation (legacy rows without an org stay visible).
 */
export const adminRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

adminRoutes.use('*', requireAuth);

const db = (c: { env: Env }) => new D1AppDatabase(c.env.DB);
const OFFLINE_GRACE_DAYS = 14;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build (and, if a private key is configured, sign) the org's entitlement doc. */
async function entitlementFor(c: { env: Env }, orgId: string): Promise<{ doc: EntitlementDoc; signed?: SignedEntitlement }> {
  const sub: Subscription =
    (await db(c).subscriptions.get(orgId)) ??
    ({ tenantId: orgId, planId: 'free', status: 'active', currentPeriodEnd: new Date(Date.now() + 1e12).toISOString() } as Subscription);
  const doc = buildEntitlementDoc({
    subscription: sub,
    issuedAt: new Date().toISOString(),
    offlineGraceDays: OFFLINE_GRACE_DAYS,
    nonce: crypto.randomUUID(),
  });
  if (c.env.ENTITLEMENT_PRIVATE_KEY) {
    const signed = await signEntitlement(doc, base64ToBytes(c.env.ENTITLEMENT_PRIVATE_KEY));
    return { doc, signed };
  }
  return { doc };
}

/* ---------- Organisation, plan & entitlements ---------- */
adminRoutes.get('/org', async (c) => {
  const auth = c.get('auth');
  const org = await new AuthStore(c.env.DB).getOrganization(auth.organizationId);
  const sub = await db(c).subscriptions.get(auth.organizationId);
  const planId = sub ? resolvePlanId(sub) : 'free';
  const { doc, signed } = await entitlementFor(c, auth.organizationId);
  const competitions = (await db(c).competitions.all()).filter((x) => x.organizationId === auth.organizationId);
  return c.json({
    organization: org ?? { id: auth.organizationId, name: '', createdAt: '' },
    account: { email: auth.email, role: auth.role },
    subscription: sub ?? null,
    plan: planFor(planId),
    entitlement: signed ?? { doc },
    usage: { concurrentEvents: competitions.length },
  });
});

adminRoutes.get('/entitlements', async (c) => {
  const { doc, signed } = await entitlementFor(c, c.get('auth').organizationId);
  return c.json(signed ?? { doc });
});

/* ---------- Competitions (org-scoped) ---------- */
adminRoutes.get('/competitions', async (c) => {
  const orgId = c.get('auth').organizationId;
  const all = await db(c).competitions.all();
  return c.json(all.filter((x) => x.organizationId === orgId || x.organizationId === undefined));
});
adminRoutes.get('/competitions/:id', async (c) => {
  const item = await db(c).competitions.get(c.req.param('id'));
  return item ? c.json(item) : c.notFound();
});
adminRoutes.put('/competitions/:id', async (c) => {
  const orgId = c.get('auth').organizationId;
  const incoming = await c.req.json<Competition>();
  await db(c).competitions.put(c.req.param('id'), { ...incoming, organizationId: incoming.organizationId ?? orgId });
  return c.json({ ok: true });
});
adminRoutes.delete('/competitions/:id', async (c) => {
  await db(c).competitions.remove(c.req.param('id'));
  return c.json({ ok: true });
});

/* ---------- Registrations (self-service sign-ups, read-only for review) ---------- */
adminRoutes.get('/competitions/:id/registrations', async (c) =>
  c.json(await db(c).registrations.byCompetition(c.req.param('id'))),
);
adminRoutes.get('/registrations/:id', async (c) => {
  const d = db(c);
  const reg = await d.registrations.get(c.req.param('id'));
  if (!reg) return c.notFound();
  const [divers, entries] = await Promise.all([d.divers.byRegistration(reg.id), d.entries.byRegistration(reg.id)]);
  const sheets = Object.fromEntries(
    (await Promise.all(entries.map(async (e) => [e.id, await d.sheets.get(e.id)] as const))).filter(([, s]) => s),
  );
  return c.json({ registration: reg, divers, entries, sheets });
});

/* ---------- Sessions (schedule structure) ---------- */
adminRoutes.get('/competitions/:id/sessions', async (c) =>
  c.json(await db(c).sessions.byCompetition(c.req.param('id'))),
);
adminRoutes.put('/sessions/:id', async (c) => {
  await db(c).sessions.put(c.req.param('id'), await c.req.json<Session>());
  return c.json({ ok: true });
});
adminRoutes.delete('/sessions/:id', async (c) => {
  await db(c).sessions.remove(c.req.param('id'));
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
