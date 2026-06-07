import { Hono } from 'hono';
import { adminRoutes } from './admin-routes';
import { stripeWebhook } from './stripe-webhook';
import type { Env } from './env';

export { SessionDO } from './session-do';

// All backend endpoints live under /api/* so the static front-ends (served from
// the same Worker via Cloudflare assets) own the other paths without collisions.
const api = new Hono<{ Bindings: Env }>();

api.get('/health', (c) => c.json({ ok: true, service: 'aquameet-api' }));
api.route('/admin', adminRoutes);
api.route('/webhooks', stripeWebhook);

/**
 * All session traffic (live WebSocket, event POSTs, projection reads) is routed
 * to the per-session Durable Object, addressed by session id.
 */
api.all('/sessions/:id/*', (c) => {
  const id = c.req.param('id');
  const stub = c.env.SESSIONS.get(c.env.SESSIONS.idFromName(id));
  return stub.fetch(c.req.raw);
});

const app = new Hono<{ Bindings: Env }>();
app.route('/api', api);

// Bare origin → the public results app. The /web, /judge, /admin paths are
// served as static assets and never reach the Worker.
app.get('/', (c) => c.redirect('/web/'));

export default app;
