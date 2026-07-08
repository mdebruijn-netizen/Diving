import { base64ToBytes, canonicalJson, toArrayBufferView } from './canonical';
import type { SignedEntitlement } from './types';

const ED25519 = { name: 'Ed25519' } as const;

/**
 * Verify a signed entitlement document against a raw Ed25519 public key.
 * Uses Web Crypto, available identically on Node, Cloudflare Workers and the
 * venue hub — no external dependency, so the same verification runs everywhere.
 */
export async function verifyEntitlement(
  signed: SignedEntitlement,
  publicKeyRaw: Uint8Array,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBufferView(publicKeyRaw),
    ED25519,
    false,
    ['verify'],
  );
  const data = new TextEncoder().encode(canonicalJson(signed.doc));
  const signature = base64ToBytes(signed.signature);
  return crypto.subtle.verify(ED25519, key, signature, data);
}
