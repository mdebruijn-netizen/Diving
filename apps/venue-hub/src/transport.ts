import type { EventEnvelope } from '@aquameet/sync';

export interface PushResult {
  /** Event ids the cloud durably accepted (acknowledged). */
  ackedEventIds: string[];
}

/**
 * The hub's view of the cloud (the Session Durable Object). Implementations
 * wrap an HTTP/WebSocket client; the contract is intentionally tiny so the hub
 * core can be tested against an in-memory fake that converges identically.
 */
export interface CloudTransport {
  /** Push events to the cloud. Must be idempotent on the cloud side. */
  push(events: readonly EventEnvelope[]): Promise<PushResult>;
  /** Event ids the cloud currently holds (for fork detection). */
  knownEventIds?(): Promise<readonly string[]>;
}
