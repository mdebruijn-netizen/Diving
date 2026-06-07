import { useEffect, useState } from 'react';
import { Badge, Button, Card, Field, Logo } from '@aquameet/ui';
import type { EventEnvelope, SessionProjection } from '@aquameet/sync';
import { SCORE_STEPS, type SessionClient } from './client';

interface PanelProps {
  client: SessionClient;
  send: (e: EventEnvelope) => void;
  projection: SessionProjection | null;
}

function openDiveId(projection: SessionProjection | null): string | undefined {
  return projection?.dives.find((d) => d.status === 'OPEN')?.diveId;
}

/** Judge keypad: tap an award for the open dive on this judge's seat. */
export function JudgePad({ client, send, projection, seat }: PanelProps & { seat: number }) {
  const [sent, setSent] = useState<number | null>(null);
  const diveId = openDiveId(projection);

  useEffect(() => {
    send(client.makeEvent({ type: 'AssignSeat', panelSeat: seat, judgeId: `seat-${seat}` }));
  }, [client, send, seat]);

  useEffect(() => {
    setSent(null);
  }, [diveId]);

  return (
    <div className="content" style={{ maxWidth: 520, margin: '0 auto', padding: '28px 20px' }}>
      <div className="between" style={{ marginBottom: 18 }}>
        <Logo />
        <Badge tone="info">Stoel {seat}</Badge>
      </div>
      <Card title="Jurycijfer">
        {diveId ? (
          <>
            <p className="muted">Sprong: {diveId}</p>
            <div className="pad-grid">
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
            {sent !== null && <p className="kicker" style={{ marginTop: 16 }}>Ingestuurd: {sent.toFixed(1)}</p>}
          </>
        ) : (
          <p className="muted">Wachten op een open sprong…</p>
        )}
      </Card>
    </div>
  );
}

/** Recorder controls: open a dive, lock it, declare a penalty. */
export function RecorderPanel({ client, send, projection }: PanelProps) {
  const [diver, setDiver] = useState('Diver 1');
  const [dd, setDd] = useState(3.0);
  const [panelSize, setPanelSize] = useState(7);
  const diveId = openDiveId(projection) ?? projection?.dives.at(-1)?.diveId;

  const openDive = () => {
    const id = `d-${Math.random().toString(36).slice(2, 7)}`;
    send(client.makeEvent({ type: 'OpenDive', diveId: id, entryId: diver, kind: 'individual', dd, panelSize }));
  };

  return (
    <div className="content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <div className="between" style={{ marginBottom: 18 }}>
        <Logo />
        <Badge tone="good">Recorder</Badge>
      </div>

      <Card title="Nieuwe sprong">
        <div className="grid cols-3" style={{ marginBottom: 14 }}>
          <Field label="Deelnemer"><input value={diver} onChange={(e) => setDiver(e.target.value)} /></Field>
          <Field label="DD"><input type="number" step="0.1" value={dd} onChange={(e) => setDd(Number(e.target.value))} /></Field>
          <Field label="Juryleden"><input type="number" value={panelSize} onChange={(e) => setPanelSize(Number(e.target.value))} /></Field>
        </div>
        <Button icon="play" onClick={openDive}>Sprong openen</Button>
      </Card>

      {diveId && (
        <Card title="Actieve sprong" className="" >
          <p className="muted" style={{ marginBottom: 12 }}>{diveId}</p>
          <div className="row wrap">
            <Button variant="ghost" onClick={() => send(client.makeEvent({ type: 'LockDive', diveId }))}>Lock sprong</Button>
            <Button variant="ghost" onClick={() => send(client.makeEvent({ type: 'DeclarePenalty', diveId, penalty: { type: 'balk' } }))}>Balk (−2)</Button>
            <Button variant="danger" onClick={() => send(client.makeEvent({ type: 'DeclarePenalty', diveId, penalty: { type: 'failed' } }))}>Mislukt (0)</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
