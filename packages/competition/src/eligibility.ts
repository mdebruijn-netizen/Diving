import type { Category } from './entities';

type AgeBand = Pick<Category, 'minBirthYear' | 'maxBirthYear'>;

/**
 * Eligibility rule for self-registration: a diver may enter their own age band
 * or an older/harder one, but never a younger/easier group. Older children have
 * earlier birth years, so the only bound that matters is the band's earliest
 * year — a diver is eligible when they are not older than the oldest child the
 * band allows. Bands with no `minBirthYear` have no lower limit.
 */
export function isDiverEligible(birthYear: number, band: AgeBand): boolean {
  return band.minBirthYear === undefined || birthYear >= band.minBirthYear;
}

/** True when the diver's birth year falls inside the band — i.e. it's their "own" group. */
export function isOwnGroup(birthYear: number, band: AgeBand): boolean {
  const aboveMin = band.minBirthYear === undefined || birthYear >= band.minBirthYear;
  const belowMax = band.maxBirthYear === undefined || birthYear <= band.maxBirthYear;
  return aboveMin && belowMax;
}

/** Human label for a group's birth-year band, e.g. "born 2016–2017" or "born ≥ 2016". */
export function ageBandLabel(band: AgeBand): string | undefined {
  const { minBirthYear: min, maxBirthYear: max } = band;
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined) return min === max ? `born ${min}` : `born ${min}–${max}`;
  if (min !== undefined) return `born ≥ ${min}`;
  return `born ≤ ${max}`;
}
