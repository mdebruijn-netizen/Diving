import { computeIndividualDive } from '@aquameet/domain';
import type { IndividualDiveResult } from '@aquameet/domain';
import type { DiveKind } from './events';
import type { DiveStatus, SessionState } from './state';

export interface DiveProjection {
  diveId: string;
  entryId: string;
  kind: DiveKind;
  status: DiveStatus;
  /** Number of scores received so far. */
  scoreCount: number;
  /** Computed once a full panel of scores is present. */
  result?: IndividualDiveResult;
  /** True while awaiting scores or for kinds not yet projected (e.g. synchro). */
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
 * Individual dives are fully projected; synchro projection is a follow-up
 * (`pending` stays true) once the panel-role layout lands in the reducer.
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

    if (dive.kind === 'individual' && values.length === dive.panelSize) {
      const result = computeIndividualDive(values, dive.dd, { retain: dive.retain });
      projection.result = result;
      projection.pending = false;
      const acc = totals.get(dive.entryId) ?? { total: 0, scoredDives: 0 };
      acc.total = roundTotal(acc.total + result.score);
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
