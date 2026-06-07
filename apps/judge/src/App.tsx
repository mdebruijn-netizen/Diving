import { useMemo } from 'react';
import { Logo } from '@aquameet/ui';
import type { ActorRole } from '@aquameet/sync';
import { SessionClient } from './client';
import { JudgePad, RecorderPanel } from './components';
import { useLiveSession } from './useLiveSession';

/**
 * Configured via query params:
 *   ?session=ID&api=https://api.example&role=judge|recorder&seat=2&device=tablet-2
 */
export function App() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session') ?? 'demo';
  const apiBase = params.get('api') ?? window.location.origin;
  const role = (params.get('role') ?? 'judge') as ActorRole;
  const seat = Number(params.get('seat') ?? '0');
  const deviceId = params.get('device') ?? `device-${role}-${seat}`;

  const { projection, connected, send } = useLiveSession(apiBase, sessionId);
  const client = useMemo(
    () => new SessionClient({ sessionId, deviceId, actorId: deviceId, actorRole: role }),
    [sessionId, deviceId, role],
  );

  if (!connected) {
    return (
      <div className="screen">
        <Logo />
        <p className="muted">Verbinden met sessie {sessionId}…</p>
      </div>
    );
  }
  return role === 'recorder' || role === 'referee' ? (
    <RecorderPanel client={client} send={send} projection={projection} />
  ) : (
    <JudgePad client={client} send={send} projection={projection} seat={seat} />
  );
}
