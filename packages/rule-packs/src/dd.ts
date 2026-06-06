import type { DivePosition, RulePack } from './schema';

export interface DdQuery {
  discipline: string;
  code: string;
  position: DivePosition;
}

/** Look up the Degree of Difficulty for a dive within a RulePack's DD table. */
export function lookupDd(pack: RulePack, query: DdQuery): number {
  const entry = pack.ddTable.find(
    (e) =>
      e.discipline === query.discipline &&
      e.code === query.code &&
      e.position === query.position,
  );
  if (!entry) {
    throw new Error(
      `no DD entry for ${query.discipline} ${query.code}${query.position} in pack ${pack.id}`,
    );
  }
  return entry.dd;
}
