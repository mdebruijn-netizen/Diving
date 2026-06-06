import type { DiveProjection, SessionProjection } from '@aquameet/sync';
import { assignRanks, type RankedRow } from '@aquameet/competition';

/**
 * Pure view-model derivation for the public results and scoreboard screens.
 * Kept free of React/DOM so it is unit-tested in CI; the components are thin
 * renderers over these functions.
 */

/** Ranking rows with shared-place ties, ready to render. */
export function rankedRows(projection: SessionProjection): RankedRow[] {
  return assignRanks(projection.ranking.map((r) => ({ entryId: r.entryId, total: r.total })));
}

/** Format an official score, or a dash when not yet scored. */
export function formatScore(value: number | undefined): string {
  return value === undefined ? '—' : value.toFixed(2);
}

/** The dive a scoreboard should highlight: the first awaiting scores, else the latest. */
export function currentDive(projection: SessionProjection): DiveProjection | undefined {
  return projection.dives.find((d) => d.pending) ?? projection.dives[projection.dives.length - 1];
}

/** Whether anything has been scored yet (for an empty-state). */
export function hasResults(projection: SessionProjection): boolean {
  return projection.ranking.length > 0;
}
