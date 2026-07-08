import { describe, it, expect } from 'vitest';
import { generateSigningKeyPair, signEntitlement } from './sign';
import { verifyEntitlement } from './verify';
import type { EntitlementDoc } from './types';

const doc: EntitlementDoc = {
  v: 1,
  tenantId: 't_1',
  plan: 'competition_pro',
  entitlements: { features: { 'competition.ejudging': true }, limits: { judgeDevices: 12 } },
  issuedAt: '2026-06-01T00:00:00.000Z',
  expiresAt: '2026-07-01T00:00:00.000Z',
  offlineGraceDays: 30,
  nonce: 'n1',
};

describe('sign/verify round trip', () => {
  it('produces a signature that verifies with the matching public key', async () => {
    const { publicKeyRaw, privateKeyPkcs8 } = await generateSigningKeyPair();
    const signed = await signEntitlement(doc, privateKeyPkcs8);
    expect(await verifyEntitlement(signed, publicKeyRaw)).toBe(true);
  });

  it('fails verification if the document is tampered after signing', async () => {
    const { publicKeyRaw, privateKeyPkcs8 } = await generateSigningKeyPair();
    const signed = await signEntitlement(doc, privateKeyPkcs8);
    const tampered = { ...signed, doc: { ...signed.doc, plan: 'enterprise' } };
    expect(await verifyEntitlement(tampered, publicKeyRaw)).toBe(false);
  });

  it('fails verification under a different key', async () => {
    const a = await generateSigningKeyPair();
    const b = await generateSigningKeyPair();
    const signed = await signEntitlement(doc, a.privateKeyPkcs8);
    expect(await verifyEntitlement(signed, b.publicKeyRaw)).toBe(false);
  });
});
