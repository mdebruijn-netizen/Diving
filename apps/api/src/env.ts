export interface Env {
  /** Durable Object namespace for per-session live scoring rooms. */
  SESSIONS: DurableObjectNamespace;
  /** Tenant database (competition entities, entries, dive sheets). */
  DB: D1Database;
  /** Object storage for documents, result exports and dive video. */
  BUCKET: R2Bucket;
  /** Stripe webhook endpoint secret. */
  STRIPE_WEBHOOK_SECRET: string;
  /** Base64 PKCS#8 Ed25519 private key for signing entitlement docs (optional). */
  ENTITLEMENT_PRIVATE_KEY?: string;
}

/** Per-request identity attached by the auth middleware. */
export interface AuthContext {
  accountId: string;
  organizationId: string;
  email: string;
  role: string;
}

export interface Vars {
  auth: AuthContext;
}
