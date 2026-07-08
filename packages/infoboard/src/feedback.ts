import type { Feedback } from './entities';

export interface FeedbackSummary {
  count: number;
  /** Mean rating, rounded to two decimals (0 when there is no feedback). */
  average: number;
  /** Number of ratings per star value 1–5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Aggregate spectator feedback into a count, average and star distribution. */
export function summariseFeedback(items: readonly Feedback[]): FeedbackSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let count = 0;

  for (const item of items) {
    const rating = Math.round(item.rating);
    if (rating < 1 || rating > 5) continue;
    distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
    total += rating;
    count += 1;
  }

  const average = count === 0 ? 0 : Math.round((total / count) * 100) / 100;
  return { count, average, distribution };
}
