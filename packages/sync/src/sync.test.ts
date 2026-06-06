import { describe, it, expect } from 'vitest';
import type { ActorRole, EventEnvelope, ScoringEvent } from './index';
import { initialSessionState, project, reduce, reduceAll } from './index';

let seq = 0;
const clientSeqByDevice = new Map<string, number>();

/** Build an envelope with sensible defaults and per-device monotonic clientSeq. */
function env(
  event: ScoringEvent,
  opts: { device?: string; role?: ActorRole; clientSeq?: number; seqOverride?: number } = {},
): EventEnvelope {
  const deviceId = opts.device ?? 'recorder-pc';
  const clientSeq = opts.clientSeq ?? (clientSeqByDevice.get(deviceId) ?? 0) + 1;
  clientSeqByDevice.set(deviceId, Math.max(clientSeq, clientSeqByDevice.get(deviceId) ?? 0));
  seq += 1;
  return {
    eventId: `e${seq}`,
    streamId: 'session:1',
    seq: opts.seqOverride ?? seq,
    hubId: 'hub-A',
    actorId: 'a',
    actorRole: opts.role ?? 'recorder',
    deviceId,
    clientSeq,
    occurredAt: new Date(Date.now() + seq).toISOString(),
    ruleHash: 'blake3:test',
    event,
  };
}

function reset() {
  seq = 0;
  clientSeqByDevice.clear();
}

describe('scoring reducer', () => {
  it('records a 7-judge individual dive and projects 66.00', () => {
    reset();
    const scores = [7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0];
    const log: EventEnvelope[] = [
      env({ type: 'OpenDive', diveId: 'd1', entryId: 'diverA', kind: 'individual', dd: 3.0, panelSize: 7 }),
      ...scores.map((value, seat) =>
        env({ type: 'SubmitScore', diveId: 'd1', panelSeat: seat, value }, { role: 'referee' }),
      ),
      env({ type: 'LockDive', diveId: 'd1' }, { role: 'referee' }),
    ];
    const state = reduceAll('1', log);
    const { dives } = project(state);
    expect(dives[0]?.status).toBe('LOCKED');
    expect(dives[0]?.pending).toBe(false);
    expect(dives[0]?.result?.score).toBe(66.0);
  });

  it('is idempotent: replaying the full log yields identical state', () => {
    reset();
    const log: EventEnvelope[] = [
      env({ type: 'OpenDive', diveId: 'd1', entryId: 'A', kind: 'individual', dd: 2.0, panelSize: 5 }),
      ...[6, 7, 8, 9, 5].map((value, seat) =>
        env({ type: 'SubmitScore', diveId: 'd1', panelSeat: seat, value }, { role: 'referee' }),
      ),
    ];
    const once = reduceAll('1', log);
    const twice = log.reduce(reduce, once); // replay on top of itself
    expect(twice).toEqual(once);
  });

  it('rejects a judge writing a seat they do not own, but allows the recorder (backup path)', () => {
    reset();
    let state = initialSessionState('1');
    // Seat 0 belongs to the tablet "judge-1".
    state = reduce(state, env({ type: 'AssignSeat', panelSeat: 0, judgeId: 'j1' }, { device: 'judge-1', role: 'judge' }));
    state = reduce(state, env({ type: 'OpenDive', diveId: 'd1', entryId: 'A', kind: 'individual', dd: 2.0, panelSize: 5 }));

    // A different tablet tries to write seat 0 -> rejected.
    state = reduce(
      state,
      env({ type: 'SubmitScore', diveId: 'd1', panelSeat: 0, value: 9.0 }, { device: 'judge-2', role: 'judge' }),
    );
    expect(state.dives.d1?.scores[0]).toBeUndefined();
    expect(state.rejected.at(-1)?.reason).toMatch(/not owned/);

    // The recorder enters seat 0 manually (tablet down) -> accepted.
    state = reduce(
      state,
      env({ type: 'SubmitScore', diveId: 'd1', panelSeat: 0, value: 6.5 }, { device: 'recorder-pc', role: 'recorder' }),
    );
    expect(state.dives.d1?.scores[0]).toBe(6.5);
  });

  it('locks a dive against new scores and allows a referee correction afterwards', () => {
    reset();
    let state = initialSessionState('1');
    state = reduce(state, env({ type: 'OpenDive', diveId: 'd1', entryId: 'A', kind: 'individual', dd: 2.0, panelSize: 3 }));
    [7, 7, 7].forEach((value, seat) => {
      state = reduce(state, env({ type: 'SubmitScore', diveId: 'd1', panelSeat: seat, value }, { role: 'referee' }));
    });
    state = reduce(state, env({ type: 'LockDive', diveId: 'd1' }, { role: 'referee' }));

    // Post-lock SubmitScore is rejected...
    state = reduce(state, env({ type: 'SubmitScore', diveId: 'd1', panelSeat: 0, value: 9 }, { role: 'referee' }));
    expect(state.rejected.at(-1)?.reason).toMatch(/locked/);
    expect(state.dives.d1?.scores[0]).toBe(7);

    // ...but a CorrectScore by the referee applies.
    state = reduce(
      state,
      env({ type: 'CorrectScore', diveId: 'd1', panelSeat: 0, value: 8, reason: 'flash misread' }, { role: 'referee' }),
    );
    expect(state.dives.d1?.scores[0]).toBe(8);
  });

  it('ranks entries by total score, highest first', () => {
    reset();
    const dive = (id: string, entry: string, base: number) => [
      env({ type: 'OpenDive', diveId: id, entryId: entry, kind: 'individual', dd: 2.0, panelSize: 3 }),
      ...[base, base, base].map((value, seat) =>
        env({ type: 'SubmitScore', diveId: id, panelSeat: seat, value }, { role: 'referee' }),
      ),
    ];
    const state = reduceAll('1', [...dive('d1', 'A', 6), ...dive('d2', 'B', 8)]);
    const { ranking } = project(state);
    expect(ranking.map((r) => r.entryId)).toEqual(['B', 'A']);
    expect(ranking[0]?.total).toBe(48.0); // 24 * 2.0
    expect(ranking[1]?.total).toBe(36.0); // 18 * 2.0
  });
});
