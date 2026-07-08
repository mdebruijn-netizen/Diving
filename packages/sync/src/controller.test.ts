import { describe, it, expect } from 'vitest';
import type { EventEnvelope, ScoringEvent } from './events';
import { SessionController } from './controller';

let seq = 0;
function env(event: ScoringEvent, role: EventEnvelope['actorRole'] = 'recorder'): EventEnvelope {
  seq += 1;
  return {
    eventId: `e${seq}`,
    streamId: 'session:1',
    seq,
    hubId: 'hub-A',
    actorId: 'a',
    actorRole: role,
    deviceId: 'recorder-pc',
    clientSeq: seq,
    occurredAt: new Date(Date.now() + seq).toISOString(),
    ruleHash: 'blake3:test',
    event,
  };
}

describe('SessionController', () => {
  it('folds an event log and projects the dive score', () => {
    seq = 0;
    const c = new SessionController('1');
    c.append(env({ type: 'OpenDive', diveId: 'd1', entryId: 'A', kind: 'individual', dd: 3.0, panelSize: 7 }));
    [7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0].forEach((value, seat) => {
      c.append(env({ type: 'SubmitScore', diveId: 'd1', panelSeat: seat, value }, 'referee'));
    });
    c.append(env({ type: 'LockDive', diveId: 'd1' }, 'referee'));

    const { dives } = c.projection();
    expect(dives[0]?.result?.score).toBe(66.0);
  });

  it('reports rejected writes (locked dive)', () => {
    seq = 0;
    const c = new SessionController('1');
    c.append(env({ type: 'OpenDive', diveId: 'd1', entryId: 'A', kind: 'individual', dd: 2.0, panelSize: 3 }));
    [7, 7, 7].forEach((value, seat) =>
      c.append(env({ type: 'SubmitScore', diveId: 'd1', panelSeat: seat, value }, 'referee')),
    );
    c.append(env({ type: 'LockDive', diveId: 'd1' }, 'referee'));
    const result = c.append(env({ type: 'SubmitScore', diveId: 'd1', panelSeat: 0, value: 9 }, 'referee'));
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/locked/);
  });

  it('rebuilds identically from its own event log', () => {
    seq = 0;
    const c = new SessionController('1');
    c.append(env({ type: 'OpenDive', diveId: 'd1', entryId: 'A', kind: 'individual', dd: 2.0, panelSize: 3 }));
    [6, 7, 8].forEach((value, seat) =>
      c.append(env({ type: 'SubmitScore', diveId: 'd1', panelSeat: seat, value }, 'referee')),
    );
    const rebuilt = SessionController.fromLog(c.events());
    expect(rebuilt.projection()).toEqual(c.projection());
  });
});
