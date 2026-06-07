# Deployment (Cloudflare Workers Builds)

The whole platform deploys as **one Worker**: the API plus the three front-ends
(results/scoreboard, judge, admin) served as static assets from the same origin.
One push to `main` → one build → everything live. No CORS, no separate Pages
projects, no API token in CI (Workers Builds uses its own build token).

## Cloudflare Workers Builds settings

In the Worker → Settings → Builds (Git integration), set:

| Field | Value |
| --- | --- |
| Root directory | `/` |
| Build command | `pnpm run build:all` |
| Deploy command | `npx wrangler deploy -c apps/api/wrangler.toml` |

`build:all` builds the three front-ends (Vite) and assembles them into
`apps/api/public/{web,judge,admin}`; `wrangler deploy` bundles the Worker and
uploads those assets. pnpm is detected from `pnpm-lock.yaml`.

## One-time resources

Already done: D1 `aquameet` (`4850f07c-…`) and R2 `aquameet` are bound in
[`apps/api/wrangler.toml`](../apps/api/wrangler.toml).

1. **Apply the D1 schema** (the database starts empty):
   ```bash
   pnpm exec wrangler d1 execute aquameet --remote --file=apps/api/migrations/0001_init.sql
   ```
2. **Stripe secret** (only if you use the billing webhook):
   ```bash
   cd apps/api && pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

## URLs after deploy

Everything is one origin (the Worker), e.g. `https://aquameet-api.<account>.workers.dev`:

- Public results: `/web/?session=<id>`
- Scoreboard: `/web/?session=<id>&view=scoreboard`
- Judge: `/judge/?session=<id>&role=judge&seat=<n>`
- Recorder: `/judge/?session=<id>&role=recorder`
- Admin (sheet validation): `/admin/`
- API: `/api/health`, `/api/sessions/:id/live` (WebSocket), `/api/admin/*`, `/api/webhooks/stripe`

The front-ends default their API base to the same origin, so no extra config is
needed. Add a custom domain on the Worker for a friendly URL.

## Local development

```bash
pnpm install
pnpm run build:all                         # build + assemble assets
pnpm --filter @aquameet/api exec wrangler dev   # serve API + assets locally
# or run a front-end on its own dev server:
pnpm --filter @aquameet/web dev
```
