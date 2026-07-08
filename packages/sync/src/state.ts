import type { PenaltyModifier } from '@aquameet/domain';
import type { DiveKind, PanelSeat, SynchroLayout } from './events';

export type DiveStatus = 'OPEN' | 'LOCKED';

export interface DiveRecord {
  diveId: string;
  entryId: string;
  kind: DiveKind;
  dd: number;
  panelSize: number;
  retain?: number;
  status: DiveStatus;
  /** Seat-role layout for synchro dives. */
  synchroLayout?: SynchroLayout;
  /** Referee penalty applied to this dive, if any. */
  penalty?: PenaltyModifier;
  /** seat index -> raw score (0–10). Plain object so state is JSON/DO-storable. */
  scores: Record<PanelSeat, number>;
}

export interface SeatAssignment {
  judgeId: string;
  deviceId: string;
}

/** Why a write was rejected — kept for the audit trail rather than thrown away. */
export interface RejectedEvent {
  eventId: string;
  reason: string;
}

export interface SessionState {
  sessionId: string;
  manualMode: boolean;
  seatAssignments: Record<PanelSeat, SeatAssignment>;
  dives: Record<string, DiveRecord>;
  /** diveIds in the order they were opened. */
  diveOrder: string[];
  /** deviceId -> highest clientSeq applied (idempotent replay guard). */
  appliedClientSeq: Record<string, number>;
  /** hubId -> highest source seq observed. */
  appliedSourceSeq: Record<string, number>;
  rejected: RejectedEvent[];
}

export function initialSessionState(sessionId: string): SessionState {
  return {
    sessionId,
    manualMode: false,
    seatAssignments: {},
    dives: {},
    diveOrder: [],
    appliedClientSeq: {},
    appliedSourceSeq: {},
    rejected: [],
  };
}
