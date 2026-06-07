import { useEffect, useState } from 'react';
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

  // Claim this seat once on mount so the diver's scores from this device count.
  useEffect(() => {
    send(client.makeEvent({ type: 'AssignSeat', panelSeat: seat, judgeId: `seat-${seat}` }));
  }, [client, send, seat]);

  // Reset the highlighted award when a new dive opens.
  useEffect(() => {
    setSent(null);
  }, [diveId]);

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
          {sent !== null && <p className="confirm">Ingestuurd: {sent.toFixed(1)}</p>}
        </>
      ) : (
        <p className="idle">Wachten op een open sprong…</p>
      )}
    </main>
  );
}

/** Recorder controls: open a dive, lock it, declare a penalty, manual backup. */
export function RecorderPanel({ client, send, projection }: PanelProps) {
  const [diver, setDiver] = useState('Diver 1');
  const [dd, setDd] = useState(3.0);
  const [panelSize, setPanelSize] = useState(7);
  const diveId = openDiveId(projection) ?? projection?.dives.at(-1)?.diveId;

  const openDive = () => {
    const id = `d-${Math.random().toString(36).slice(2, 7)}`;
    send(
      client.makeEvent({
        type: 'OpenDive',
        diveId: id,
        entryId: diver,
        kind: 'individual',
        dd,
        panelSize,
      }),
    );
  };

  return (
    <main className="recorder">
      <h1>Recorder</h1>

      <section className="open-dive">
        <h2>Nieuwe sprong</h2>
        <label>
          Deelnemer
          <input value={diver} onChange={(e) => setDiver(e.target.value)} />
        </label>
        <label>
          DD
          <input type="number" step="0.1" value={dd} onChange={(e) => setDd(Number(e.target.value))} />
        </label>
        <label>
          Juryleden
          <input
            type="number"
            value={panelSize}
            onChange={(e) => setPanelSize(Number(e.target.value))}
          />
        </label>
        <button onClick={openDive}>Sprong openen</button>
      </section>

      {diveId && (
        <section className="controls">
          <p className="dive">Actieve sprong: {diveId}</p>
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
        </section>
      )}
    </main>
  );
}
