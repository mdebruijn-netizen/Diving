/**
 * Licensing entitlements (plan Deel 2 §C).
 *
 * Entitlements are distributed as a small JSON document signed with Ed25519.
 * Clients — including the offline venue hub and desktop scoretafel — verify the
 * signature with an embedded public key, so feature-gating works air-gapped and
 * a live meet is never blocked by a lapsed network connection (offline grace).
 */

export const FEATURE_KEYS = [
  'infoboard.module',
  'infoboard.polls',
  'infoboard.feedback',
  'competition.module',
  'competition.ejudging',
  'competition.synchro',
  'competition.liveremote',
  'scoreboard.external',
  'scoreboard.broadcast',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface Entitlements {
  /** Feature flag map; absent or false means "not entitled". */
  features: Partial<Record<FeatureKey, boolean>>;
  /** Numeric limits, e.g. concurrentEvents, judgeDevices, channels. */
  limits: Record<string, number>;
}

export interface EntitlementDoc {
  v: number;
  tenantId: string;
  plan: string;
  entitlements: Entitlements;
  /** ISO timestamp the document was issued. */
  issuedAt: string;
  /** ISO timestamp after which an online renewal is required. */
  expiresAt: string;
  /** Days past `expiresAt` the document still functions offline. */
  offlineGraceDays: number;
  nonce: string;
}

export interface SignedEntitlement {
  doc: EntitlementDoc;
  /** Base64 Ed25519 signature over the canonical JSON of `doc`. */
  signature: string;
}

export type EntitlementStatus = 'active' | 'grace' | 'expired';
