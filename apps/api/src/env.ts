export interface Env {
  /** Durable Object namespace for per-session live scoring rooms. */
  SESSIONS: DurableObjectNamespace;
  /** Tenant database (competition entities, entries, dive sheets). */
  DB: D1Database;
  /** Object storage for documents, result exports and dive video. */
  BUCKET: R2Bucket;
  /** Stripe webhook endpoint secret. */
  STRIPE_WEBHOOK_SECRET: string;
}
