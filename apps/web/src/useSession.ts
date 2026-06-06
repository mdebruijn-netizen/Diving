import { useEffect, useState } from 'react';
import type { SessionProjection } from '@aquameet/sync';

/**
 * Subscribe to a session's live projection over the Session Durable Object
 * WebSocket. Reconnects on change of session/endpoint; returns the latest
 * projection, or null until the first message arrives.
 */
export function useSession(apiBase: string, sessionId: string): SessionProjection | null {
  const [projection, setProjection] = useState<SessionProjection | null>(null);

  useEffect(() => {
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/sessions/${sessionId}/live`;
    const ws = new WebSocket(wsUrl);
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

  return projection;
}
