import { SessionController } from '@aquameet/sync';
import type { AppendResult, EventEnvelope, SessionProjection } from '@aquameet/sync';
import { Outbox } from './outbox';
import type { CloudTransport } from './transport';

export interface SyncResult {
  pushed: number;
  acked: number;
}

/**
 * Venue Hub core (plan Deel 1 + §B): the LAN-local authority for a live meet.
 *
 * The hub owns the authoritative event log so the unreliable public network is
 * off the scoring critical path. Every event is applied locally AND queued in
 * the outbox for mirroring to the cloud. Sync is idempotent and resumable.
 * Competition data is never silently auto-merged — divergent cloud events are
 * surfaced as a fork for manual resolution.
 */
export class VenueHub {
  private readonly controller: SessionController;
  private readonly outbox = new Outbox();

  constructor(sessionId: string) {
    this.controller = new SessionController(sessionId);
  }

  /** Apply an event to the authoritative local state and queue it for the cloud. */
  submit(env: EventEnvelope): AppendResult {
    const result = this.controller.append(env);
    this.outbox.enqueue(env);
    return result;
  }

  projection(): SessionProjection {
    return this.controller.projection();
  }

  pendingCount(): number {
    return this.outbox.pendingCount();
  }

  /** Drain the outbox to the cloud. Safe to call repeatedly; resends un-acked. */
  async sync(transport: CloudTransport): Promise<SyncResult> {
    const pending = this.outbox.pending();
    if (pending.length === 0) return { pushed: 0, acked: 0 };
    this.outbox.markSent(pending.map((e) => e.eventId));
    const { ackedEventIds } = await transport.push(pending);
    this.outbox.markAcked(ackedEventIds);
    return { pushed: pending.length, acked: ackedEventIds.length };
  }

  /**
   * Detect a fork: cloud events the hub has never seen. We return them rather
   * than merge — competition results must be resolved by a human, not guessed.
   */
  detectFork(cloudEventIds: readonly string[]): string[] {
    const local = new Set(this.controller.events().map((e) => e.eventId));
    return cloudEventIds.filter((id) => !local.has(id));
  }
}
