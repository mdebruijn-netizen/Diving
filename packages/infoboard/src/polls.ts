import type { Poll, Vote } from './entities';

export interface PollOptionTally {
  optionId: string;
  label: string;
  count: number;
  /** Share of total votes, 0–100, rounded to one decimal. */
  percentage: number;
}

export interface PollResult {
  totalVotes: number;
  tally: PollOptionTally[];
  /** Leading option id, or undefined on no votes / an exact tie for the lead. */
  winnerOptionId?: string;
}

/**
 * Tally a poll. Each device counts once: with `allowRevote` the latest vote
 * wins, otherwise the first. Votes for options not on the poll are ignored.
 */
export function tallyPoll(poll: Poll, votes: readonly Vote[]): PollResult {
  const validOptionIds = new Set(poll.options.map((o) => o.id));
  const byDevice = new Map<string, string>();

  for (const vote of votes) {
    if (vote.pollId !== poll.id || !validOptionIds.has(vote.optionId)) continue;
    if (!poll.allowRevote && byDevice.has(vote.deviceId)) continue;
    byDevice.set(vote.deviceId, vote.optionId);
  }

  const counts = new Map<string, number>();
  for (const optionId of byDevice.values()) {
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }

  const totalVotes = byDevice.size;
  const tally: PollOptionTally[] = poll.options.map((option) => {
    const count = counts.get(option.id) ?? 0;
    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 1000) / 10;
    return { optionId: option.id, label: option.label, count, percentage };
  });

  return { totalVotes, tally, winnerOptionId: leader(tally) };
}

function leader(tally: readonly PollOptionTally[]): string | undefined {
  let best: PollOptionTally | undefined;
  let tied = false;
  for (const option of tally) {
    if (option.count === 0) continue;
    if (!best || option.count > best.count) {
      best = option;
      tied = false;
    } else if (option.count === best.count) {
      tied = true;
    }
  }
  return best && !tied ? best.optionId : undefined;
}
