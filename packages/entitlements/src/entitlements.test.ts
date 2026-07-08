import { describe, it, expect } from 'vitest';
import {
  bytesToBase64,
  can,
  canNow,
  canonicalJson,
  isUsable,
  limit,
  status,
  verifyEntitlement,
  type EntitlementDoc,
  type SignedEntitlement,
} from './index';

function makeDoc(overrides: Partial<EntitlementDoc> = {}): EntitlementDoc {
  return {
    v: 1,
    tenantId: 't_123',
    plan: 'competition_pro',
    entitlements: {
      features: {
        'infoboard.module': true,
        'competition.module': true,
        'competition.ejudging': true,
        'competition.liveremote': true,
      },
      limits: { concurrentEvents: 4, judgeDevices: 12 },
    },
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    offlineGraceDays: 45,
    nonce: 'abc',
    ...overrides,
  };
}

async function sign(doc: EntitlementDoc): Promise<{ signed: SignedEntitlement; publicKey: Uint8Array }> {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  if (!('privateKey' in pair)) throw new Error('expected an Ed25519 key pair');
  const data = new TextEncoder().encode(canonicalJson(doc));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, data));
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { signed: { doc, signature: bytesToBase64(sig) }, publicKey };
}

describe('canonicalJson', () => {
  it('orders keys deterministically regardless of insertion order', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
  });
});

describe('Ed25519 verification', () => {
  it('verifies a correctly signed document', async () => {
    const { signed, publicKey } = await sign(makeDoc());
    expect(await verifyEntitlement(signed, publicKey)).toBe(true);
  });

  it('rejects a tampered document', async () => {
    const { signed, publicKey } = await sign(makeDoc());
    const tampered: SignedEntitlement = {
      ...signed,
      doc: { ...signed.doc, plan: 'enterprise_unlimited' },
    };
    expect(await verifyEntitlement(tampered, publicKey)).toBe(false);
  });

  it('rejects a signature from a different key', async () => {
    const { signed } = await sign(makeDoc());
    const { publicKey: otherKey } = await sign(makeDoc({ nonce: 'other' }));
    expect(await verifyEntitlement(signed, otherKey)).toBe(false);
  });
});

describe('feature gating', () => {
  it('reads feature flags and limits', () => {
    const doc = makeDoc();
    expect(can(doc, 'competition.ejudging')).toBe(true);
    expect(can(doc, 'scoreboard.broadcast')).toBe(false);
    expect(limit(doc, 'judgeDevices')).toBe(12);
    expect(limit(doc, 'unknown')).toBe(Infinity);
  });
});

describe('validity and offline grace', () => {
  const doc = makeDoc(); // expires 2026-07-01, +45d grace

  it('is active before expiry', () => {
    expect(status(doc, new Date('2026-06-01T00:00:00Z'))).toBe('active');
  });

  it('is in grace within the offline window', () => {
    expect(status(doc, new Date('2026-07-20T00:00:00Z'))).toBe('grace');
    expect(isUsable(doc, new Date('2026-07-20T00:00:00Z'))).toBe(true);
  });

  it('is expired after the grace window', () => {
    expect(status(doc, new Date('2026-09-01T00:00:00Z'))).toBe('expired');
    expect(isUsable(doc, new Date('2026-09-01T00:00:00Z'))).toBe(false);
  });

  it('canNow grants features in grace but never once expired', () => {
    expect(canNow(doc, 'competition.ejudging', new Date('2026-07-20T00:00:00Z'))).toBe(true);
    expect(canNow(doc, 'competition.ejudging', new Date('2026-09-01T00:00:00Z'))).toBe(false);
  });
});
