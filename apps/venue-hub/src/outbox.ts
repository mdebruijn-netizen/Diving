import type { EventEnvelope } from '@aquameet/sync';

export type OutboxStatus = 'pending' | 'sent' | 'acked';

interface OutboxEntry {
  env: EventEnvelope;
  status: OutboxStatus;
  attempts: number;
}

/**
 * Durable outbox for cloud sync (plan Deel 2 §B). Events are enqueued as the
 * meet runs and drained to the cloud; un-acked events are re-sent on the next
 * drain (the cloud dedups by deviceId/clientSeq, so resends are harmless).
 * Enqueue is idempotent by eventId.
 */
export class Outbox {
  private readonly entries = new Map<string, OutboxEntry>();
  private readonly order: string[] = [];

  enqueue(env: EventEnvelope): void {
    if (this.entries.has(env.eventId)) return;
    this.entries.set(env.eventId, { env, status: 'pending', attempts: 0 });
    this.order.push(env.eventId);
  }

  /** Events not yet acknowledged, in enqueue order (pending + sent-awaiting-ack). */
  pending(): EventEnvelope[] {
    return this.order
      .map((id) => this.entries.get(id))
      .filter((e): e is OutboxEntry => !!e && e.status !== 'acked')
      .map((e) => e.env);
  }

  markSent(eventIds: readonly string[]): void {
    for (const id of eventIds) {
      const entry = this.entries.get(id);
      if (entry && entry.status !== 'acked') {
        entry.status = 'sent';
        entry.attempts += 1;
      }
    }
  }

  markAcked(eventIds: readonly string[]): void {
    for (const id of eventIds) {
      const entry = this.entries.get(id);
      if (entry) entry.status = 'acked';
    }
  }

  pendingCount(): number {
    return this.pending().length;
  }

  attemptsFor(eventId: string): number {
    return this.entries.get(eventId)?.attempts ?? 0;
  }
}
