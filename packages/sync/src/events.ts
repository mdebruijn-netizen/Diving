/**
 * Event model for the offline-first scoring protocol (plan Deel 2 §B).
 *
 * Scoring is an append-only log of commands. The reducer ({@link reduce}) folds
 * these into session state, and the projection derives results via
 * `@aquameet/domain`. Because the log is the source of truth and results are
 * always recomputed, the venue hub, the Session Durable Object and every client
 * converge on byte-identical results.
 */

export type ActorRole = 'judge' | 'recorder' | 'referee' | 'organiser' | 'system';

/** 0-based seat index within a judging panel. */
export type PanelSeat = number;

export type DiveKind = 'individual' | 'synchro';

/** Which panel seats judge execution-A, execution-B and synchronisation. */
export interface SynchroLayout {
  executionASeats: PanelSeat[];
  executionBSeats: PanelSeat[];
  synchronisationSeats: PanelSeat[];
}

/** Discriminated union of scoring commands (the event payloads). */
export type ScoringEvent =
  | { type: 'AssignSeat'; panelSeat: PanelSeat; judgeId: string }
  | { type: 'ReleaseSeat'; panelSeat: PanelSeat }
  | {
      type: 'OpenDive';
      diveId: string;
      entryId: string;
      kind: DiveKind;
      dd: number;
      panelSize: number;
      /** Middle scores retained (defaults to RulePack value at projection time). */
      retain?: number;
      /** Required for synchro dives: maps panel seats to their judging role. */
      synchro?: SynchroLayout;
    }
  | { type: 'SubmitScore'; diveId: string; panelSeat: PanelSeat; value: number }
  | { type: 'CorrectScore'; diveId: string; panelSeat: PanelSeat; value: number; reason: string }
  | { type: 'LockDive'; diveId: string }
  | { type: 'UnlockDive'; diveId: string; reason: string }
  | { type: 'SetManualMode'; on: boolean };

export type ScoringEventType = ScoringEvent['type'];

/**
 * Transport envelope wrapping each event with the metadata needed for ordering,
 * idempotent replay, authority and auditing.
 */
export interface EventEnvelope {
  eventId: string;
  /** Stream the event belongs to, i.e. the session id. */
  streamId: string;
  /** Monotonic sequence within the source authority (`hubId`). */
  seq: number;
  /** Source authority: a hub uuid, or "cloud". */
  hubId: string;
  actorId: string;
  actorRole: ActorRole;
  deviceId: string;
  /** Monotonic per-device counter — the idempotency key for replay dedup. */
  clientSeq: number;
  occurredAt: string;
  /** RulePack version hash active when the event occurred. */
  ruleHash: string;
  event: ScoringEvent;
}
