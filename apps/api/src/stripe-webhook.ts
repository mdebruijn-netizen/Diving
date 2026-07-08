import { Hono } from 'hono';
import { applyBillingEvent, stripeEventToBilling, verifyStripeSignature } from '@aquameet/control-plane';
import { D1AppDatabase } from './d1-database';
import type { Env } from './env';

/**
 * Stripe webhook: verify the signature over the raw body, map the event to a
 * billing event, and advance the tenant's subscription in the database. The
 * tenant is identified by `data.object.metadata.tenantId` on the Stripe object.
 */
export const stripeWebhook = new Hono<{ Bindings: Env }>();

stripeWebhook.post('/stripe', async (c) => {
  const raw = await c.req.text();
  const signature = c.req.header('stripe-signature') ?? '';
  const ok = await verifyStripeSignature(raw, signature, c.env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return c.json({ error: 'invalid signature' }, 400);

  const event = JSON.parse(raw) as {
    type: string;
    data: { object: { metadata?: { tenantId?: string } } };
  };
  const billing = stripeEventToBilling(event.type);
  const tenantId = event.data.object.metadata?.tenantId;
  if (!billing || !tenantId) return c.json({ ignored: true });

  const db = new D1AppDatabase(c.env.DB);
  const sub = await db.subscriptions.get(tenantId);
  if (!sub) return c.json({ error: 'unknown tenant' }, 404);

  try {
    const updated = applyBillingEvent(sub, billing);
    await db.subscriptions.put(tenantId, updated);
    return c.json({ status: updated.status });
  } catch {
    // Illegal transition for the current state — acknowledge without changing.
    return c.json({ status: sub.status, note: 'no-op' });
  }
});
