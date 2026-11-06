import type { Entry } from './entities';

/**
 * Start-list draw (plan v2 §5, Phase 3). Pure and deterministic so results are
 * reproducible and testable: the random draw uses a seeded PRNG, so the same
 * `(entries, seed)` always produces the same running order.
 */

export type DrawMethod = 'random' | 'seeded';

/** One position in a category's running order. */
export interface StartListItem {
  id: string;
  categoryId: string;
  entryId: string;
  /** 0-based position in the running order. */
  order: number;
}

/** A small, fast, deterministic PRNG (mulberry32) — seeded for reproducibility. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle driven by a seeded PRNG. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export interface DrawInput {
  entryId: string;
  /** Seed value for a seeded draw — lower dives first; missing seeds go last. */
  seed?: number;
}

/**
 * Produce an ordered list of entry ids.
 * - `random`: a reproducible shuffle driven by `randomSeed`.
 * - `seeded`: stable ascending order by `seed` (weakest first, strongest last);
 *   entries without a seed keep their input order at the end.
 */
export function generateDraw(entries: readonly DrawInput[], method: DrawMethod, randomSeed: number): { entryId: string; order: number }[] {
  let ordered: DrawInput[];
  if (method === 'random') {
    ordered = seededShuffle(entries, randomSeed);
  } else {
    ordered = [...entries]
      .map((e, i) => ({ e, i }))
      .sort((a, b) => {
        const sa = a.e.seed ?? Number.POSITIVE_INFINITY;
        const sb = b.e.seed ?? Number.POSITIVE_INFINITY;
        return sa === sb ? a.i - b.i : sa - sb;
      })
      .map(({ e }) => e);
  }
  return ordered.map((e, order) => ({ entryId: e.entryId, order }));
}

/** Build persistable StartListItems from a draw result for a category. */
export function toStartList(categoryId: string, draw: { entryId: string; order: number }[], id: (i: number) => string): StartListItem[] {
  return draw.map((d, i) => ({ id: id(i), categoryId, entryId: d.entryId, order: d.order }));
}

/** Order entries by a start list (entries not in the list are appended in input order). */
export function orderEntries(entries: readonly Entry[], startList: readonly StartListItem[]): Entry[] {
  const pos = new Map(startList.map((s) => [s.entryId, s.order]));
  return [...entries].sort((a, b) => (pos.get(a.id) ?? Number.POSITIVE_INFINITY) - (pos.get(b.id) ?? Number.POSITIVE_INFINITY));
}
