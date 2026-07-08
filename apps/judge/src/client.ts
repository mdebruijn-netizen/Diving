import type { ActorRole, EventEnvelope, ScoringEvent } from '@aquameet/sync';

export interface SessionClientConfig {
  sessionId: string;
  deviceId: string;
  actorId: string;
  actorRole: ActorRole;
  hubId?: string;
  ruleHash?: string;
  /** Clock, injectable for tests. */
  now?: () => string;
  /** Event id factory, injectable for tests. */
  newId?: () => string;
}

/** Valid judge awards: 0–10 in half-point steps (21 values). */
export const SCORE_STEPS: number[] = Array.from({ length: 21 }, (_, i) => i * 0.5);

/**
 * Builds scoring event envelopes for a device, assigning a monotonic per-device
 * `clientSeq` (the idempotency key the reducer dedups on). Pure and runtime-
 * agnostic so it is unit-tested in Node and reused by the judge/recorder UI.
 */
export class SessionClient {
  private clientSeq = 0;

  constructor(private readonly cfg: SessionClientConfig) {}

  makeEvent(event: ScoringEvent): EventEnvelope {
    this.clientSeq += 1;
    return {
      eventId: (this.cfg.newId ?? (() => crypto.randomUUID()))(),
      streamId: this.cfg.sessionId,
      seq: this.clientSeq,
      hubId: this.cfg.hubId ?? this.cfg.deviceId,
      actorId: this.cfg.actorId,
      actorRole: this.cfg.actorRole,
      deviceId: this.cfg.deviceId,
      clientSeq: this.clientSeq,
      occurredAt: (this.cfg.now ?? (() => new Date().toISOString()))(),
      ruleHash: this.cfg.ruleHash ?? 'unknown',
      event,
    };
  }

  /** Convenience: a judge submitting their seat's award. */
  submitScore(diveId: string, panelSeat: number, value: number): EventEnvelope {
    return this.makeEvent({ type: 'SubmitScore', diveId, panelSeat, value });
  }
}
