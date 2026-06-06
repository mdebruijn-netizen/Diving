# @aquameet/web

Public live surfaces for AquaMeet — **results** and a big-screen **scoreboard** —
as a Vite + React app for Cloudflare Pages. It subscribes to a session's live
projection over the Session Durable Object WebSocket and renders it.

A single deploy serves both surfaces via query params:

- Results: `/?session=<id>&api=https://api.example`
- Scoreboard: `/?session=<id>&view=scoreboard&api=https://api.example`

`api` defaults to the page origin; the WebSocket URL is derived as
`<api>/sessions/<id>/live`.

## Development

```bash
pnpm --filter @aquameet/web dev      # vite dev server
pnpm --filter @aquameet/web build    # production build (Pages output)
pnpm typecheck                       # type-checks this app too
pnpm test                            # runs the pure view-model tests
```

The view logic (ranking with ties, score formatting, current-dive selection)
lives in `src/view-model.ts` and is unit-tested; the React components are thin
renderers over it.
