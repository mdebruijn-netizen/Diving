import { describe, it, expect } from 'vitest';
import { SCORE_STEPS, SessionClient } from './client';

function makeClient() {
  let n = 0;
  return new SessionClient({
    sessionId: 'session:1',
    deviceId: 'tablet-3',
    actorId: 'judge-3',
    actorRole: 'judge',
    ruleHash: 'blake3:test',
    now: () => '2026-06-06T00:00:00.000Z',
    newId: () => `evt-${(n += 1)}`,
  });
}

describe('SCORE_STEPS', () => {
  it('lists 0–10 in half-point steps', () => {
    expect(SCORE_STEPS).toHaveLength(21);
    expect(SCORE_STEPS[0]).toBe(0);
    expect(SCORE_STEPS[1]).toBe(0.5);
    expect(SCORE_STEPS.at(-1)).toBe(10);
  });
});

describe('SessionClient', () => {
  it('assigns a monotonic clientSeq and fills the envelope', () => {
    const client = makeClient();
    const a = client.submitScore('d1', 2, 7.5);
    const b = client.submitScore('d1', 2, 8.0);

    expect(a.clientSeq).toBe(1);
    expect(b.clientSeq).toBe(2);
    expect(a).toMatchObject({
      streamId: 'session:1',
      deviceId: 'tablet-3',
      actorRole: 'judge',
      ruleHash: 'blake3:test',
      event: { type: 'SubmitScore', diveId: 'd1', panelSeat: 2, value: 7.5 },
    });
    expect(a.eventId).toBe('evt-1');
  });

  it('wraps arbitrary scoring events', () => {
    const client = makeClient();
    const lock = client.makeEvent({ type: 'LockDive', diveId: 'd1' });
    expect(lock.event).toEqual({ type: 'LockDive', diveId: 'd1' });
    expect(lock.clientSeq).toBe(1);
  });
});
