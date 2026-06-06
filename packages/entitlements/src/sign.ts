import { bytesToBase64, canonicalJson, toArrayBufferView } from './canonical';
import type { EntitlementDoc, SignedEntitlement } from './types';

const ED25519 = { name: 'Ed25519' } as const;

export interface SigningKeyPair {
  /** Raw public key (distribute/embed in clients for verification). */
  publicKeyRaw: Uint8Array<ArrayBuffer>;
  /** PKCS#8 private key (kept secret at the signing edge). */
  privateKeyPkcs8: Uint8Array<ArrayBuffer>;
}

/** Generate an Ed25519 signing key pair (one-off, for the control plane). */
export async function generateSigningKeyPair(): Promise<SigningKeyPair> {
  const pair = await crypto.subtle.generateKey(ED25519, true, ['sign', 'verify']);
  if (!('privateKey' in pair)) throw new Error('expected an Ed25519 key pair');
  const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const privateKeyPkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  return { publicKeyRaw, privateKeyPkcs8 };
}

/** Sign an entitlement document with a PKCS#8 Ed25519 private key. */
export async function signEntitlement(
  doc: EntitlementDoc,
  privateKeyPkcs8: Uint8Array,
): Promise<SignedEntitlement> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    toArrayBufferView(privateKeyPkcs8),
    ED25519,
    false,
    ['sign'],
  );
  const data = new TextEncoder().encode(canonicalJson(doc));
  const signature = new Uint8Array(await crypto.subtle.sign(ED25519, key, data));
  return { doc, signature: bytesToBase64(signature) };
}
