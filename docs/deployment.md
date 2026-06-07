# Deployment (GitHub → Cloudflare)

Every push to `main` runs [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml),
which type-checks, tests, builds and deploys:

- **`apps/api`** → a Cloudflare **Worker** (with the `SessionDO` Durable Object and the `DB` D1 binding)
- **`apps/web` / `apps/judge` / `apps/admin`** → Cloudflare **Pages** projects

The deploy never sees your token directly — it reads it from GitHub Secrets.

## One-time setup

You do these once; after that, pushing to `main` deploys automatically.

### 1. Create a Cloudflare API token

Cloudflare dashboard → My Profile → API Tokens → Create Token. Permissions needed:

- Account · **Workers Scripts** · Edit
- Account · **D1** · Edit
- Account · **Cloudflare Pages** · Edit
- Account · **Workers Durable Objects** · Edit

Note your **Account ID** (Workers & Pages overview page).

### 2. Add GitHub repository secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

- `CLOUDFLARE_API_TOKEN` — the token from step 1
- `CLOUDFLARE_ACCOUNT_ID` — your account id

### 3. Create the D1 database (once)

```bash
# locally, authenticated with the same token (wrangler login or CLOUDFLARE_API_TOKEN env)
pnpm exec wrangler d1 create aquameet
```

Copy the printed `database_id` into [`apps/api/wrangler.toml`](../apps/api/wrangler.toml)
(replace the placeholder), then apply the schema:

```bash
pnpm exec wrangler d1 execute aquameet --remote --file=apps/api/migrations/0001_init.sql
```

### 4. Worker secrets (once)

```bash
cd apps/api
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

### 5. Deploy

Merge to `main` (or run the **Deploy** workflow manually via *Actions → Deploy → Run workflow*).
The Pages projects (`aquameet-web`, `aquameet-judge`, `aquameet-admin`) are created automatically
on first run.

## Wiring the front-ends to the API

The Pages apps take the API base via the `?api=` query param (defaulting to their own origin).
Point them at the deployed Worker, e.g. `https://aquameet-web.pages.dev/?session=<id>&api=https://aquameet-api.<account>.workers.dev`.
For a cleaner setup, add a custom domain / route so the Worker and Pages share an origin.

## Notes

- `pnpm.onlyBuiltDependencies` (root `package.json`) allows `esbuild`/`workerd` build scripts so
  Vite builds and Wrangler run in CI.
- Local dev: `pnpm --filter @aquameet/api exec wrangler dev` and `pnpm --filter @aquameet/web dev`.
- An alternative to GitHub Actions is Cloudflare's native Git integration (Workers Builds + Pages),
  but Actions keeps the Worker, Durable Object, D1 and three Pages apps in one gated pipeline.
