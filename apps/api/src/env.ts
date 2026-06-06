export interface Env {
  /** Durable Object namespace for per-session live scoring rooms. */
  SESSIONS: DurableObjectNamespace;
  /** Tenant database (competition entities, entries, dive sheets). */
  DB: D1Database;
}
