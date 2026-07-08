import type { CategoryRules, DiveListItem, ValidationResult } from '@aquameet/competition';
import { validateDiveSheet } from '@aquameet/competition';
import { finaDiving20172021, lookupDd } from '@aquameet/rule-packs';
import type { DivePosition } from '@aquameet/rule-packs';

/** Disciplines matching the FINA DD table (shared with the admin). */
export type Discipline =
  | 'springboard-1m'
  | 'springboard-3m'
  | 'platform-5m'
  | 'platform-7.5m'
  | 'platform-10m';

/** Parse a free-text dive sheet — one dive per line, "code position" (e.g. "5253 B"). */
export function parseSheetInput(text: string): DiveListItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [code = '', position = 'A'] = line.split(/\s+/);
      return { code, position: position.toUpperCase() as DivePosition };
    });
}

/** Validate a parsed sheet against a category's rules using the FINA DD table. */
export function validateSheet(discipline: Discipline, items: DiveListItem[], rules: CategoryRules): ValidationResult {
  const resolveDd = (item: DiveListItem): number | undefined => {
    try {
      return lookupDd(finaDiving20172021, { discipline, code: item.code, position: item.position });
    } catch {
      return undefined;
    }
  };
  return validateDiveSheet({ entryId: 'draft', dives: items }, rules, resolveDd);
}

/** Degree of Difficulty for a single dive, or undefined if the combination is unknown. */
export function diveDd(discipline: Discipline, item: DiveListItem): number | undefined {
  if (!item.code.trim()) return undefined;
  try {
    return lookupDd(finaDiving20172021, { discipline, code: item.code, position: item.position });
  } catch {
    return undefined;
  }
}
