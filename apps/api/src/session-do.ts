import type { EventEnvelope } from '@aquameet/sync';
import type { Env } from './env';
import { SessionController } from './session-controller';

/**
 * Session Durable Object — the live scoring room (plan Deel 2 §F).
 *
 * One instance per session: strongly consistent, holds the event log, persists
 * it to DO storage, and fans out the recomputed projection to connected clients
 * (tablets, recorder, scoreboard, remote viewers). The scoring logic itself
 * lives in the runtime-agnostic, unit-tested {@link SessionController}.
 *
 * NOTE: this uses the standard accept()/in-memory-socket-set pattern for the
 * skeleton; migrating to WebSocket Hibernation (so thousands of remote viewers
 * are cheap) is a follow-up.
 */
export class SessionDO {
  private controller = new SessionController('');
  private readonly sockets = new Set<WebSocket>();

  constructor(private readonly state: DurableObjectState, _env: Env) {
    this.state.blockConcurrencyWhile(async () => {
      const stored = (await this.state.storage.get<EventEnvelope[]>('events')) ?? [];
      this.controller = SessionController.fromLog(stored);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/live')) {
      return this.handleWebSocket();
    }
    if (request.method === 'POST' && url.pathname.endsWith('/events')) {
      const env = (await request.json()) as EventEnvelope;
      const result = this.controller.append(env);
      await this.persist();
      this.broadcast();
      return Response.json(result);
    }
    if (url.pathname.endsWith('/projection')) {
      return Response.json(this.controller.projection());
    }
    return new Response('not found', { status: 404 });
  }

  private handleWebSocket(): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.sockets.add(server);

    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? event.data : '';
        const env = JSON.parse(data) as EventEnvelope;
        this.controller.append(env);
        await this.persist();
        this.broadcast();
      } catch {
        server.send(JSON.stringify({ type: 'error', message: 'invalid event' }));
      }
    });
    server.addEventListener('close', () => {
      this.sockets.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(): void {
    const message = JSON.stringify({
      type: 'projection',
      projection: this.controller.projection(),
    });
    for (const socket of this.sockets) {
      socket.send(message);
    }
  }

  private async persist(): Promise<void> {
    await this.state.storage.put('events', this.controller.events());
  }
}
