import { describe, it, expect } from 'vitest';
import type { Channel, DocumentItem, Feedback, Poll, Vote } from './index';
import {
  canAccessChannel,
  canTransition,
  summariseFeedback,
  tallyPoll,
  transitionDocument,
  visibleDocuments,
} from './index';

describe('document lifecycle', () => {
  const doc: DocumentItem = {
    id: 'd1',
    channelId: 'c1',
    title: 'Start list',
    fileKey: 'r2://c1/startlist.pdf',
    state: 'draft',
    version: 1,
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  it('allows draft -> published and bumps version', () => {
    const published = transitionDocument(doc, 'published', '2026-06-02T00:00:00.000Z');
    expect(published.state).toBe('published');
    expect(published.version).toBe(2);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('draft', 'archived')).toBe(false);
    expect(() => transitionDocument(doc, 'archived', 'now')).toThrow(/illegal/);
  });

  it('shows only published documents, newest first', () => {
    const docs: DocumentItem[] = [
      { ...doc, id: 'a', state: 'published', updatedAt: '2026-06-01T00:00:00.000Z' },
      { ...doc, id: 'b', state: 'draft', updatedAt: '2026-06-03T00:00:00.000Z' },
      { ...doc, id: 'c', state: 'published', updatedAt: '2026-06-02T00:00:00.000Z' },
    ];
    expect(visibleDocuments(docs).map((d) => d.id)).toEqual(['c', 'a']);
  });
});

describe('channel access', () => {
  const priv: Channel = { id: 'c1', tenantId: 't1', name: 'Regio', isPublic: false, accessCode: '1234' };
  const pub: Channel = { id: 'c2', tenantId: 't1', name: 'Open', isPublic: true };

  it('grants public channels to everyone', () => {
    expect(canAccessChannel(pub)).toBe(true);
  });

  it('checks the access code for private channels', () => {
    expect(canAccessChannel(priv, '1234')).toBe(true);
    expect(canAccessChannel(priv, 'wrong')).toBe(false);
    expect(canAccessChannel(priv)).toBe(false);
  });
});

describe('poll tally', () => {
  const poll: Poll = {
    id: 'p1',
    channelId: 'c1',
    question: 'Best dive?',
    options: [
      { id: 'o1', label: 'A' },
      { id: 'o2', label: 'B' },
    ],
    allowRevote: false,
    closed: false,
  };

  it('counts one vote per device and computes percentages', () => {
    const votes: Vote[] = [
      { pollId: 'p1', optionId: 'o1', deviceId: 'd1' },
      { pollId: 'p1', optionId: 'o1', deviceId: 'd2' },
      { pollId: 'p1', optionId: 'o2', deviceId: 'd3' },
      { pollId: 'p1', optionId: 'o1', deviceId: 'd1' }, // duplicate, ignored (no revote)
    ];
    const result = tallyPoll(poll, votes);
    expect(result.totalVotes).toBe(3);
    expect(result.tally.find((t) => t.optionId === 'o1')).toMatchObject({ count: 2, percentage: 66.7 });
    expect(result.winnerOptionId).toBe('o1');
  });

  it('honours revote (latest wins)', () => {
    const votes: Vote[] = [
      { pollId: 'p1', optionId: 'o1', deviceId: 'd1' },
      { pollId: 'p1', optionId: 'o2', deviceId: 'd1' },
    ];
    const result = tallyPoll({ ...poll, allowRevote: true }, votes);
    expect(result.totalVotes).toBe(1);
    expect(result.winnerOptionId).toBe('o2');
  });

  it('reports no winner on a tie', () => {
    const votes: Vote[] = [
      { pollId: 'p1', optionId: 'o1', deviceId: 'd1' },
      { pollId: 'p1', optionId: 'o2', deviceId: 'd2' },
    ];
    expect(tallyPoll(poll, votes).winnerOptionId).toBeUndefined();
  });

  it('ignores votes for unknown options', () => {
    const votes: Vote[] = [{ pollId: 'p1', optionId: 'ghost', deviceId: 'd1' }];
    expect(tallyPoll(poll, votes).totalVotes).toBe(0);
  });
});

describe('feedback summary', () => {
  it('aggregates count, average and distribution', () => {
    const items: Feedback[] = [
      { channelId: 'c1', rating: 5 },
      { channelId: 'c1', rating: 4 },
      { channelId: 'c1', rating: 5 },
    ];
    const summary = summariseFeedback(items);
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(4.67);
    expect(summary.distribution[5]).toBe(2);
    expect(summary.distribution[4]).toBe(1);
  });

  it('ignores out-of-range ratings and handles empty input', () => {
    expect(summariseFeedback([{ channelId: 'c1', rating: 9 }]).count).toBe(0);
    expect(summariseFeedback([]).average).toBe(0);
  });
});
