import { useState } from 'react';
import type { EventEnvelope, SessionProjection } from '@aquameet/sync';
import { SCORE_STEPS, type SessionClient } from './client';

interface PanelProps {
  client: SessionClient;
  send: (e: EventEnvelope) => void;
  projection: SessionProjection | null;
}

/** The dive currently awaiting scores, if any. */
function openDiveId(projection: SessionProjection | null): string | undefined {
  return projection?.dives.find((d) => d.status === 'OPEN')?.diveId;
}

/** Judge keypad: tap an award for the open dive on this judge's seat. */
export function JudgePad({ client, send, projection, seat }: PanelProps & { seat: number }) {
  const [sent, setSent] = useState<number | null>(null);
  const diveId = openDiveId(projection);

  return (
    <main className="judge">
      <h1>Jurylid — stoel {seat}</h1>
      {diveId ? (
        <>
          <p className="dive">Sprong: {diveId}</p>
          <div className="pad">
            {SCORE_STEPS.map((value) => (
              <button
                key={value}
                className={sent === value ? 'selected' : ''}
                onClick={() => {
                  send(client.submitScore(diveId, seat, value));
                  setSent(value);
                }}
              >
                {value.toFixed(1)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="idle">Wachten op een open sprong…</p>
      )}
    </main>
  );
}

/** Recorder controls: lock, declare a penalty, and manual backup entry. */
export function RecorderPanel({ client, send, projection }: PanelProps) {
  const diveId = openDiveId(projection) ?? projection?.dives.at(-1)?.diveId;

  return (
    <main className="recorder">
      <h1>Recorder</h1>
      {diveId ? (
        <section className="controls">
          <p className="dive">Sprong: {diveId}</p>
          <button onClick={() => send(client.makeEvent({ type: 'LockDive', diveId }))}>
            Lock sprong
          </button>
          <button
            onClick={() =>
              send(client.makeEvent({ type: 'DeclarePenalty', diveId, penalty: { type: 'balk' } }))
            }
          >
            Balk (−2)
          </button>
          <button
            onClick={() =>
              send(client.makeEvent({ type: 'DeclarePenalty', diveId, penalty: { type: 'failed' } }))
            }
          >
            Mislukt (0)
          </button>
          <button onClick={() => send(client.makeEvent({ type: 'SetManualMode', on: true }))}>
            Handmatige modus aan
          </button>
        </section>
      ) : (
        <p className="idle">Geen actieve sprong.</p>
      )}
    </main>
  );
}
