# @aquameet/judge

Judge and recorder client (Vite + React) for live scoring. Opens one WebSocket
to the Session Durable Object: it renders the live projection and sends scoring
events over the same connection.

Configured by query params:

- Judge: `/?session=<id>&role=judge&seat=<n>&device=<id>&api=https://api.example`
- Recorder/referee: `/?session=<id>&role=recorder&api=https://api.example`

Judges tap an award (0–10 in half-point steps) for the open dive on their seat.
The recorder can lock a dive, declare a balk/failed penalty, and switch to manual
backup mode (entering any seat when a tablet is down).

## Development

```bash
pnpm --filter @aquameet/judge dev
pnpm typecheck   # type-checks this app
pnpm test        # runs the SessionClient envelope tests
```

Envelope construction (monotonic `clientSeq`, the reducer's idempotency key)
lives in `src/client.ts` and is unit-tested; the React components are thin
renderers that call it.
