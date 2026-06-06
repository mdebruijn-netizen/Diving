import { Hono } from 'hono';
import type { Env } from './env';

export { SessionDO } from './session-do';

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, service: 'aquameet-api' }));

/**
 * All session traffic (live WebSocket, event POSTs, projection reads) is routed
 * to the per-session Durable Object, addressed by session id.
 */
app.all('/sessions/:id/*', (c) => {
  const id = c.req.param('id');
  const stub = c.env.SESSIONS.get(c.env.SESSIONS.idFromName(id));
  return stub.fetch(c.req.raw);
});

export default app;
