import { initialSessionState, project, reduce } from '@aquameet/sync';
import type { EventEnvelope, SessionProjection, SessionState } from '@aquameet/sync';

export interface AppendResult {
  accepted: boolean;
  reason?: string;
}

/**
 * Runtime-agnostic session controller: folds the scoring event log into state
 * and exposes the recomputed projection. It depends only on the pure
 * `@aquameet/sync` package (no Cloudflare APIs), so it is unit-tested in Node
 * and reused unchanged inside the Session Durable Object.
 */
export class SessionController {
  private state: SessionState;
  private readonly log: EventEnvelope[] = [];

  constructor(sessionId: string) {
    this.state = initialSessionState(sessionId);
  }

  /** Rebuild a controller by replaying a persisted event log. */
  static fromLog(events: readonly EventEnvelope[]): SessionController {
    const controller = new SessionController(events[0]?.streamId ?? '');
    for (const env of events) controller.append(env);
    return controller;
  }

  /** Apply an event. Idempotent replays and rejected writes are both reported. */
  append(env: EventEnvelope): AppendResult {
    const rejectedBefore = this.state.rejected.length;
    const next = reduce(this.state, env);
    const isReplay = next === this.state;
    this.state = next;
    if (!isReplay) this.log.push(env);
    if (this.state.rejected.length > rejectedBefore) {
      return { accepted: false, reason: this.state.rejected.at(-1)?.reason };
    }
    return { accepted: true };
  }

  snapshot(): SessionState {
    return this.state;
  }

  projection(): SessionProjection {
    return project(this.state);
  }

  events(): readonly EventEnvelope[] {
    return this.log;
  }
}
