import { ddEntrySchema, type DdEntry, type RulePack } from './schema';

/**
 * Degree of Difficulty table import + validation (plan Deel 3 §Q).
 *
 * The official DD tables are licensed data supplied as a source file, NOT
 * invented here. This module parses a CSV export into validated `DdEntry`
 * records and cross-checks the table, so an official import is verifiable
 * (and snapshot-testable) before it ever drives a competition.
 *
 * Expected CSV columns (header row required): discipline,group,code,position,dd
 */
export function parseDdCsv(csv: string): DdEntry[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const header = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  const required = ['discipline', 'group', 'code', 'position', 'dd'];
  for (const col of required) {
    if (!header.includes(col)) throw new Error(`DD CSV is missing required column "${col}"`);
  }
  const idx = Object.fromEntries(required.map((c) => [c, header.indexOf(c)])) as Record<string, number>;

  return lines.slice(1).map((line, row) => {
    const cells = line.split(',').map((c) => c.trim());
    const raw = {
      discipline: cells[idx.discipline!],
      group: Number(cells[idx.group!]),
      code: cells[idx.code!],
      position: cells[idx.position!],
      dd: Number(cells[idx.dd!]),
    };
    const parsed = ddEntrySchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`DD CSV row ${row + 1} is invalid: ${parsed.error.issues[0]?.message}`);
    }
    return parsed.data;
  });
}

export type DdIssueCode = 'DUPLICATE' | 'GROUP_MISMATCH' | 'IMPLAUSIBLE_DD';

export interface DdIssue {
  code: DdIssueCode;
  message: string;
  entry: DdEntry;
}

/**
 * Cross-check a DD table: no duplicate (discipline, code, position); the group
 * digit matches the code's leading digit; DD within a plausible range.
 */
export function validateDdTable(entries: readonly DdEntry[]): { ok: boolean; issues: DdIssue[] } {
  const issues: DdIssue[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const key = `${entry.discipline}|${entry.code}|${entry.position}`;
    if (seen.has(key)) {
      issues.push({ code: 'DUPLICATE', message: `duplicate dive ${key}`, entry });
    }
    seen.add(key);

    if (Number(entry.code[0]) !== entry.group) {
      issues.push({
        code: 'GROUP_MISMATCH',
        message: `group ${entry.group} does not match code ${entry.code}`,
        entry,
      });
    }
    if (entry.dd < 1.0 || entry.dd > 4.9) {
      issues.push({ code: 'IMPLAUSIBLE_DD', message: `DD ${entry.dd} is outside 1.0–4.9`, entry });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Return a copy of `pack` with its DD table replaced by an imported, validated table. */
export function withDdTable(pack: RulePack, ddTable: DdEntry[]): RulePack {
  return { ...pack, ddTable };
}
