/**
 * Ranking and advancement (plan Deel 3 §J). Diving ties stand — tied divers
 * share a place ("1, 2, 2, 4" ranking) — and when a tie spans a final's cut
 * line, all tied divers advance unless a dive-off is configured.
 */

export interface RankableRow {
  entryId: string;
  total: number;
}

export interface RankedRow extends RankableRow {
  /** 1-based place; tied rows share the same rank. */
  rank: number;
}

/** Assign places by descending total, with ties sharing a rank (1, 2, 2, 4). */
export function assignRanks(rows: readonly RankableRow[]): RankedRow[] {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const ranked: RankedRow[] = [];
  let lastTotal: number | undefined;
  let lastRank = 0;

  sorted.forEach((row, index) => {
    if (lastTotal !== undefined && row.total === lastTotal) {
      ranked.push({ ...row, rank: lastRank });
    } else {
      lastRank = index + 1;
      lastTotal = row.total;
      ranked.push({ ...row, rank: lastRank });
    }
  });
  return ranked;
}

export interface AdvanceOptions {
  /** Whether divers tied on the cut line all advance (default true). */
  includeTies?: boolean;
}

/** Select the entryIds advancing to the next round. */
export function selectAdvancing(
  rows: readonly RankableRow[],
  count: number,
  options: AdvanceOptions = {},
): string[] {
  if (count <= 0) return [];
  const ranked = assignRanks(rows);
  if (ranked.length <= count) return ranked.map((r) => r.entryId);

  if (options.includeTies === false) {
    return ranked.slice(0, count).map((r) => r.entryId);
  }
  const cutRank = ranked[count - 1]!.rank;
  return ranked.filter((r) => r.rank <= cutRank).map((r) => r.entryId);
}
