import type { BillingEvent } from './subscription';

/**
 * Map a Stripe event type to a billing event. Unknown/irrelevant events return
 * undefined and are ignored by the webhook handler.
 */
export function stripeEventToBilling(stripeType: string): BillingEvent | undefined {
  switch (stripeType) {
    case 'customer.subscription.created':
      return { type: 'activate' };
    case 'customer.subscription.deleted':
      return { type: 'cancel' };
    case 'invoice.payment_failed':
      return { type: 'payment_failed' };
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      return { type: 'payment_recovered' };
    default:
      return undefined;
  }
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time-ish hex comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Stripe webhook signature (`Stripe-Signature` header) over the raw
 * request body using the endpoint secret, with a timestamp tolerance. Pure Web
 * Crypto (HMAC-SHA256), so it runs on the Worker and is testable in Node.
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  options: { toleranceSeconds?: number; nowSeconds?: number } = {},
): Promise<boolean> {
  const tolerance = options.toleranceSeconds ?? 300;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k?.trim() ?? '', v?.trim() ?? ''];
    }),
  );
  const timestamp = Number(parts.t);
  const provided = parts.v1;
  if (!timestamp || !provided) return false;
  if (Math.abs(now - timestamp) > tolerance) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`)),
  );
  return safeEqual(toHex(mac), provided);
}
