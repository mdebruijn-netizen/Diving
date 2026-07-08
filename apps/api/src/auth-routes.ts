import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import {
  hashPassword,
  newFreeSubscription,
  randomToken,
  verifyPassword,
  type Account,
  type AuthToken,
  type Organization,
} from '@aquameet/control-plane';
import { AuthStore } from './auth-store';
import { D1AppDatabase } from './d1-database';
import type { Env, Vars } from './env';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_TTL_MS = 30 * 60 * 1000; // 30 minutes

const store = (c: { env: Env }) => new AuthStore(c.env.DB);

function isoIn(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

async function issueSession(c: { env: Env }, account: Account): Promise<AuthToken> {
  const token: AuthToken = {
    token: randomToken(),
    accountId: account.id,
    organizationId: account.organizationId,
    kind: 'session',
    expiresAt: isoIn(SESSION_TTL_MS),
    createdAt: new Date().toISOString(),
  };
  await store(c).putToken(token);
  return token;
}

function sessionResponse(account: Account, org: Organization, token: string) {
  return { token, email: account.email, organizationId: org.id, org: org.name, role: account.role };
}

/** Bearer-token guard for organiser routes; attaches the auth context. */
export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const s = store(c);
  const found = await s.getToken(token);
  if (!found || found.kind !== 'session' || Date.parse(found.expiresAt) < Date.now()) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const account = await s.getAccount(found.accountId);
  if (!account) return c.json({ error: 'unauthorized' }, 401);
  c.set('auth', {
    accountId: account.id,
    organizationId: account.organizationId,
    email: account.email,
    role: account.role,
  });
  await next();
};

export const authRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Create an organisation + its first (owner) account on the free plan. */
authRoutes.post('/signup', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; orgName?: string }>();
  const email = (body.email ?? '').trim().toLowerCase();
  const orgName = (body.orgName ?? '').trim();
  if (!email || !orgName) return c.json({ error: 'email_and_org_required' }, 400);

  const s = store(c);
  if (await s.getAccountByEmail(email)) return c.json({ error: 'email_in_use' }, 409);

  const now = new Date().toISOString();
  const org: Organization = { id: crypto.randomUUID(), name: orgName, createdAt: now };
  const account: Account = {
    id: crypto.randomUUID(),
    organizationId: org.id,
    email,
    passwordHash: body.password ? await hashPassword(body.password) : undefined,
    role: 'org_admin',
    createdAt: now,
  };
  await s.createOrganization(org);
  await s.createAccount(account);
  // Provision the free subscription so entitlements resolve immediately.
  await new D1AppDatabase(c.env.DB).subscriptions.put(org.id, newFreeSubscription(org.id));

  const token = await issueSession(c, account);
  return c.json(sessionResponse(account, org, token.token));
});

/** Password login. */
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !body.password) return c.json({ error: 'invalid_credentials' }, 401);

  const s = store(c);
  const account = await s.getAccountByEmail(email);
  if (!account?.passwordHash || !(await verifyPassword(body.password, account.passwordHash))) {
    return c.json({ error: 'invalid_credentials' }, 401);
  }
  const org = await s.getOrganization(account.organizationId);
  if (!org) return c.json({ error: 'invalid_credentials' }, 401);
  const token = await issueSession(c, account);
  return c.json(sessionResponse(account, org, token.token));
});

/**
 * Request a magic link. Returns `{ sent: true }`; the `link` is also returned so
 * it works without an email provider configured (dev) — wire Resend later to
 * actually email it and stop returning the link.
 */
authRoutes.post('/magic/request', async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = (body.email ?? '').trim().toLowerCase();
  if (!email) return c.json({ error: 'email_required' }, 400);

  const s = store(c);
  const account = await s.getAccountByEmail(email);
  // Always answer the same way so the endpoint can't enumerate accounts.
  if (!account) return c.json({ sent: true });

  const magic: AuthToken = {
    token: randomToken(),
    accountId: account.id,
    organizationId: account.organizationId,
    kind: 'magic',
    expiresAt: isoIn(MAGIC_TTL_MS),
    createdAt: new Date().toISOString(),
  };
  await s.putToken(magic);
  const origin = new URL(c.req.url).origin;
  return c.json({ sent: true, link: `${origin}/admin/#/magic/${magic.token}` });
});

/** Exchange a magic token for a session. */
authRoutes.post('/magic/consume', async (c) => {
  const body = await c.req.json<{ token?: string }>();
  if (!body.token) return c.json({ error: 'invalid_token' }, 400);

  const s = store(c);
  const magic = await s.getToken(body.token);
  if (!magic || magic.kind !== 'magic' || Date.parse(magic.expiresAt) < Date.now()) {
    return c.json({ error: 'invalid_token' }, 401);
  }
  await s.deleteToken(magic.token); // single-use
  const account = await s.getAccount(magic.accountId);
  const org = account && (await s.getOrganization(account.organizationId));
  if (!account || !org) return c.json({ error: 'invalid_token' }, 401);
  const token = await issueSession(c, account);
  return c.json(sessionResponse(account, org, token.token));
});

authRoutes.post('/logout', requireAuth, async (c) => {
  const header = c.req.header('Authorization') ?? '';
  await store(c).deleteToken(header.slice(7));
  return c.json({ ok: true });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const auth = c.get('auth');
  const org = await store(c).getOrganization(auth.organizationId);
  return c.json({ email: auth.email, org: org?.name ?? '', organizationId: auth.organizationId, role: auth.role });
});
