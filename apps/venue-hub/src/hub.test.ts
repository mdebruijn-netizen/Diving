import { describe, it, expect } from 'vitest';
import { SessionController } from '@aquameet/sync';
import type { EventEnvelope, ScoringEvent } from '@aquameet/sync';
import { VenueHub } from './hub';
import type { CloudTransport, PushResult } from './transport';

let seq = 0;
function env(event: ScoringEvent, role: EventEnvelope['actorRole'] = 'referee'): EventEnvelope {
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

/** In-memory stand-in for the Session Durable Object: folds events identically. */
class FakeCloud implements CloudTransport {
  readonly controller = new SessionController('1');
  /** Ack only this many of each push (to exercise resume), default all. */
  ackLimit = Infinity;

  async push(events: readonly EventEnvelope[]): Promise<PushResult> {
    const acked: string[] = [];
    for (const e of events.slice(0, this.ackLimit)) {
      this.controller.append(e);
      acked.push(e.eventId);
    }
    return { ackedEventIds: acked };
  }

  async knownEventIds(): Promise<readonly string[]> {
    return this.controller.events().map((e) => e.eventId);
  }
}

function dive(diveId: string, entryId: string, scores: number[]): EventEnvelope[] {
  return [
    env({ type: 'OpenDive', diveId, entryId, kind: 'individual', dd: 3.0, panelSize: scores.length }),
    ...scores.map((value, seat) => env({ type: 'SubmitScore', diveId, panelSeat: seat, value })),
    env({ type: 'LockDive', diveId }),
  ];
}

describe('VenueHub', () => {
  it('applies events locally and projects results', () => {
    seq = 0;
    const hub = new VenueHub('1');
    for (const e of dive('d1', 'A', [7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0])) hub.submit(e);
    expect(hub.projection().dives[0]?.result?.score).toBe(66.0);
  });

  it('syncs the outbox to the cloud and converges to identical projections', async () => {
    seq = 0;
    const hub = new VenueHub('1');
    const cloud = new FakeCloud();
    for (const e of dive('d1', 'A', [7.0, 8.0, 7.5, 6.5, 8.5, 7.5, 7.0])) hub.submit(e);

    expect(hub.pendingCount()).toBe(9); // open + 7 scores + lock
    const result = await hub.sync(cloud);

    expect(result.acked).toBe(9);
    expect(hub.pendingCount()).toBe(0);
    expect(cloud.controller.projection()).toEqual(hub.projection());
  });

  it('resumes: un-acked events are re-sent on the next sync', async () => {
    seq = 0;
    const hub = new VenueHub('1');
    const cloud = new FakeCloud();
    for (const e of dive('d1', 'A', [6, 6, 6])) hub.submit(e); // 5 events

    cloud.ackLimit = 2; // cloud only acks the first 2
    const first = await hub.sync(cloud);
    expect(first.acked).toBe(2);
    expect(hub.pendingCount()).toBe(3);

    cloud.ackLimit = Infinity; // connection recovers
    const second = await hub.sync(cloud);
    expect(second.acked).toBe(3);
    expect(hub.pendingCount()).toBe(0);
    expect(cloud.controller.projection()).toEqual(hub.projection());
  });

  it('enqueue is idempotent and sync is a no-op when nothing is pending', async () => {
    seq = 0;
    const hub = new VenueHub('1');
    const cloud = new FakeCloud();
    const e = env({ type: 'SetManualMode', on: true });
    hub.submit(e);
    hub.submit(e); // same eventId -> not double-queued
    expect(hub.pendingCount()).toBe(1);
    await hub.sync(cloud);
    expect(await hub.sync(cloud)).toEqual({ pushed: 0, acked: 0 });
  });

  it('flags cloud-only events as a fork instead of merging them', () => {
    seq = 0;
    const hub = new VenueHub('1');
    hub.submit(env({ type: 'SetManualMode', on: true })); // e1 known locally
    const fork = hub.detectFork(['e1', 'cloud-only-1', 'cloud-only-2']);
    expect(fork).toEqual(['cloud-only-1', 'cloud-only-2']);
  });
});
