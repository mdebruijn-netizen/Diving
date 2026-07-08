/** Format a competition's day(s): a single date, or a "start – end" range. */
export function formatDateRange(start: string, end?: string): string {
  return end && end !== start ? `${start} – ${end}` : start;
}
