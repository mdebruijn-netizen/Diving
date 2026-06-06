import type { EventEnvelope, ScoringEvent } from './events';
import type { SessionState } from './state';
import { initialSessionState } from './state';

const PRIVILEGED = new Set(['recorder', 'referee', 'organiser', 'system']);

function reject(state: SessionState, env: EventEnvelope, reason: string): void {
  state.rejected.push({ eventId: env.eventId, reason });
}

/**
 * Apply a single mutation to a draft state. Returns nothing; mutates `draft`,
 * which the caller has already cloned. Conflict rules (plan Deel 2 §B):
 * seat ownership, the OPEN→LOCKED dive lifecycle, and the recorder/referee
 * backup path for manual entry when a tablet is down.
 */
function applyEvent(draft: SessionState, env: EventEnvelope): void {
  const ev: ScoringEvent = env.event;
  const privileged = PRIVILEGED.has(env.actorRole);

  switch (ev.type) {
    case 'AssignSeat': {
      draft.seatAssignments[ev.panelSeat] = { judgeId: ev.judgeId, deviceId: env.deviceId };
      return;
    }
    case 'ReleaseSeat': {
      delete draft.seatAssignments[ev.panelSeat];
      return;
    }
    case 'OpenDive': {
      if (draft.dives[ev.diveId]) {
        reject(draft, env, `dive ${ev.diveId} already open`);
        return;
      }
      draft.dives[ev.diveId] = {
        diveId: ev.diveId,
        entryId: ev.entryId,
        kind: ev.kind,
        dd: ev.dd,
        panelSize: ev.panelSize,
        retain: ev.retain,
        status: 'OPEN',
        scores: {},
      };
      draft.diveOrder.push(ev.diveId);
      return;
    }
    case 'SubmitScore': {
      const dive = draft.dives[ev.diveId];
      if (!dive) return reject(draft, env, `unknown dive ${ev.diveId}`);
      if (dive.status === 'LOCKED') {
        return reject(draft, env, `dive ${ev.diveId} is locked; use CorrectScore`);
      }
      const seat = draft.seatAssignments[ev.panelSeat];
      const ownsSeat = seat?.deviceId === env.deviceId;
      // A judge may only write their own seat. The recorder/referee may write any
      // seat — this is the first-class manual/backup path when a tablet is down.
      if (!ownsSeat && !privileged) {
        return reject(draft, env, `seat ${ev.panelSeat} not owned by device ${env.deviceId}`);
      }
      dive.scores[ev.panelSeat] = ev.value;
      return;
    }
    case 'CorrectScore': {
      const dive = draft.dives[ev.diveId];
      if (!dive) return reject(draft, env, `unknown dive ${ev.diveId}`);
      if (!privileged) {
        return reject(draft, env, `CorrectScore requires recorder/referee, got ${env.actorRole}`);
      }
      dive.scores[ev.panelSeat] = ev.value;
      return;
    }
    case 'LockDive': {
      const dive = draft.dives[ev.diveId];
      if (!dive) return reject(draft, env, `unknown dive ${ev.diveId}`);
      if (!privileged) return reject(draft, env, `LockDive requires recorder/referee`);
      dive.status = 'LOCKED';
      return;
    }
    case 'UnlockDive': {
      const dive = draft.dives[ev.diveId];
      if (!dive) return reject(draft, env, `unknown dive ${ev.diveId}`);
      if (!privileged) return reject(draft, env, `UnlockDive requires recorder/referee`);
      dive.status = 'OPEN';
      return;
    }
    case 'SetManualMode': {
      if (!privileged) return reject(draft, env, `SetManualMode requires recorder/referee`);
      draft.manualMode = ev.on;
      return;
    }
  }
}

/**
 * Fold one event into the state, purely. Idempotent: replaying an event already
 * seen from a device (by `clientSeq`) is a no-op that returns the original state.
 */
export function reduce(state: SessionState, env: EventEnvelope): SessionState {
  const lastClientSeq = state.appliedClientSeq[env.deviceId] ?? 0;
  if (env.clientSeq <= lastClientSeq) {
    return state; // already applied — idempotent replay
  }
  const draft: SessionState = structuredClone(state);
  applyEvent(draft, env);
  draft.appliedClientSeq[env.deviceId] = env.clientSeq;
  const lastSourceSeq = draft.appliedSourceSeq[env.hubId] ?? 0;
  if (env.seq > lastSourceSeq) {
    draft.appliedSourceSeq[env.hubId] = env.seq;
  }
  return draft;
}

/** Replay an event log into session state from scratch. */
export function reduceAll(sessionId: string, events: readonly EventEnvelope[]): SessionState {
  return events.reduce(reduce, initialSessionState(sessionId));
}
