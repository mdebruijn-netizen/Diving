import { useEffect, useRef, useState } from 'react';
import type { EventEnvelope, SessionProjection } from '@aquameet/sync';

export interface LiveSession {
  projection: SessionProjection | null;
  connected: boolean;
  /** Send a scoring event envelope to the session. */
  send: (envelope: EventEnvelope) => void;
}

/**
 * Open a single WebSocket to the Session Durable Object: receive live projection
 * updates and send scoring events over the same connection.
 */
export function useLiveSession(apiBase: string, sessionId: string): LiveSession {
  const [projection, setProjection] = useState<SessionProjection | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/sessions/${sessionId}/live`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    ws.addEventListener('open', () => setConnected(true));
    ws.addEventListener('close', () => setConnected(false));
    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string) as {
          type?: string;
          projection?: SessionProjection;
        };
        if (message.type === 'projection' && message.projection) {
          setProjection(message.projection);
        }
      } catch {
        /* ignore malformed frames */
      }
    });
    return () => ws.close();
  }, [apiBase, sessionId]);

  const send = (envelope: EventEnvelope) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(envelope));
    }
  };

  return { projection, connected, send };
}
