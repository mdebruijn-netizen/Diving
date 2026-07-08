import { computeIndividualDive, computeSynchroDive } from '@aquameet/domain';
import type { IndividualDiveResult, SynchroDiveResult } from '@aquameet/domain';
import type { DiveKind } from './events';
import type { DiveRecord, DiveStatus, SessionState } from './state';

export interface DiveProjection {
  diveId: string;
  entryId: string;
  kind: DiveKind;
  status: DiveStatus;
  /** Number of scores received so far. */
  scoreCount: number;
  /** Official dive score, once computed (individual or synchro). */
  score?: number;
  /** Detail for an individual dive. */
  result?: IndividualDiveResult;
  /** Detail for a synchronised dive. */
  synchroResult?: SynchroDiveResult;
  /** True while awaiting a full panel of scores. */
  pending: boolean;
}

export interface RankingRow {
  entryId: string;
  total: number;
  scoredDives: number;
}

export interface SessionProjection {
  dives: DiveProjection[];
  ranking: RankingRow[];
}

/**
 * Derive dive results and the entry ranking from session state. Results are
 * always recomputed from the event-sourced state (never patched in place), so
 * any runtime that has the same events produces the same projection.
 *
 * Both individual and synchronised dives are fully projected once their full
 * panel of scores is present.
 */
export function project(state: SessionState): SessionProjection {
  const dives: DiveProjection[] = [];
  const totals = new Map<string, { total: number; scoredDives: number }>();

  for (const diveId of state.diveOrder) {
    const dive = state.dives[diveId];
    if (!dive) continue;
    const values = Object.values(dive.scores);
    const projection: DiveProjection = {
      diveId: dive.diveId,
      entryId: dive.entryId,
      kind: dive.kind,
      status: dive.status,
      scoreCount: values.length,
      pending: true,
    };

    if (values.length === dive.panelSize) {
      if (dive.kind === 'individual') {
        const result = computeIndividualDive(values, dive.dd, {
          retain: dive.retain,
          penalty: dive.penalty,
        });
        projection.result = result;
        projection.score = result.score;
        projection.pending = false;
      } else if (dive.kind === 'synchro' && dive.synchroLayout) {
        const result = computeSynchroDive(synchroPanels(dive), dive.dd, { penalty: dive.penalty });
        projection.synchroResult = result;
        projection.score = result.score;
        projection.pending = false;
      }
    }

    if (!projection.pending && projection.score !== undefined) {
      const acc = totals.get(dive.entryId) ?? { total: 0, scoredDives: 0 };
      acc.total = roundTotal(acc.total + projection.score);
      acc.scoredDives += 1;
      totals.set(dive.entryId, acc);
    }

    dives.push(projection);
  }

  const ranking: RankingRow[] = [...totals.entries()]
    .map(([entryId, { total, scoredDives }]) => ({ entryId, total, scoredDives }))
    .sort((a, b) => b.total - a.total);

  return { dives, ranking };
}

function roundTotal(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Gather the three synchro panels' scores from a dive's seat-role layout. */
function synchroPanels(dive: DiveRecord) {
  const layout = dive.synchroLayout!;
  const pick = (seats: number[]): number[] =>
    seats.map((s) => dive.scores[s]).filter((v): v is number => v !== undefined);
  return {
    executionA: pick(layout.executionASeats),
    executionB: pick(layout.executionBSeats),
    synchronisation: pick(layout.synchronisationSeats),
  };
}
