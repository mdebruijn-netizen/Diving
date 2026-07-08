import { describe, it, expect } from 'vitest';
import { stripeEventToBilling, verifyStripeSignature } from './stripe';

describe('stripeEventToBilling', () => {
  it('maps known Stripe events to billing events', () => {
    expect(stripeEventToBilling('customer.subscription.created')).toEqual({ type: 'activate' });
    expect(stripeEventToBilling('customer.subscription.deleted')).toEqual({ type: 'cancel' });
    expect(stripeEventToBilling('invoice.payment_failed')).toEqual({ type: 'payment_failed' });
    expect(stripeEventToBilling('invoice.paid')).toEqual({ type: 'payment_recovered' });
  });

  it('ignores unknown events', () => {
    expect(stripeEventToBilling('charge.refunded')).toBeUndefined();
  });
});

async function stripeHeader(body: string, secret: string, t: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)),
  );
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${t},v1=${hex}`;
}

describe('verifyStripeSignature', () => {
  const body = '{"type":"invoice.paid"}';
  const secret = 'whsec_test';
  const now = 1_700_000_000;

  it('accepts a valid, recent signature', async () => {
    const header = await stripeHeader(body, secret, now);
    expect(await verifyStripeSignature(body, header, secret, { nowSeconds: now })).toBe(true);
  });

  it('rejects a wrong secret', async () => {
    const header = await stripeHeader(body, secret, now);
    expect(await verifyStripeSignature(body, header, 'whsec_wrong', { nowSeconds: now })).toBe(false);
  });

  it('rejects a stale timestamp', async () => {
    const header = await stripeHeader(body, secret, now - 10_000);
    expect(await verifyStripeSignature(body, header, secret, { nowSeconds: now })).toBe(false);
  });

  it('rejects a malformed header', async () => {
    expect(await verifyStripeSignature(body, 'garbage', secret, { nowSeconds: now })).toBe(false);
  });
});
