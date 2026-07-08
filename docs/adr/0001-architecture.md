# ADR 0001 — Platform architecture (AquaMeet)

- **Status:** Accepted
- **Date:** 2026-06-06

## Context

AquaMeet rebuilds DiveRecorder (springboard/platform diving competition management
and e-judging under World Aquatics rules) and integrates a Sportity-like event
infoboard. It must run **with and without** the competition module, behind a
commercial SaaS licensing model, across four clients (mobile, web admin, judge
tablet, desktop scoretafel), and be **fully offline-resilient at the poolside**
while the cloud remains the source of truth.

The full product/architecture plan lives outside the repo (planning document);
this ADR records the binding technical decisions.

## Decisions

1. **TypeScript end-to-end.** A single language lets us write the scoring/rule
   engine **once** in a shared, pure package (`@aquameet/domain`) and run the
   identical code on every runtime (Worker, venue hub, desktop, tablet, mobile).
   Correctness of the scoring math is the crown jewel; this is where it is won.

2. **Cloudflare infrastructure.** Cloud API on **Workers (Hono)**; live scoring
   sessions on **Durable Objects** (one per session: strongly consistent,
   WebSocket-hibernation rooms); **D1** for relational data (one D1 per tenant +
   a control-plane D1); **R2** for documents/exports/video; **KV** for cached
   entitlements/config; **Queues** for push/billing; **Pages** for web/admin,
   public results and scoreboard; optional **Stream** for live video.

3. **Local-first at the venue, cloud as source of truth.** A **Local Venue Hub**
   on the venue LAN runs the live competition so unreliable public wifi is off
   the scoring critical path. Scoring is an **append-only event log**; results
   are always recomputed by `@aquameet/domain`, never patched in place. The Hub
   mirrors to a Session Durable Object via an idempotent outbox; competition data
   is never silently auto-merged (forks are flagged for manual resolution).

4. **Rules are data (`@aquameet/rule-packs`).** Versioned, content-addressable
   RulePacks define panels, drop/normalise behaviour, rounding and DD tables.
   Every result records the pack version used, keeping results reproducible.

5. **Multi-tenancy via D1-per-tenant** (no Postgres RLS on Cloudflare) plus a
   control-plane D1 for tenants/subscriptions/licenses. Feature entitlements are
   resolved from the plan and enforced on every client; the hub/desktop verify a
   signed, offline-checkable license so a live meet is never blocked mid-event.

## Repository (this commit — Phase 0 foundation)

- `packages/domain` — pure scoring engine (individual + synchronised), shared.
- `packages/rule-packs` — RulePack Zod schema, DD lookup, World Aquatics preset.
- Golden-master + property-based tests (`pnpm test`) and typecheck (`pnpm typecheck`).

Apps (`apps/api` Worker + Session DO, `apps/venue-hub`, clients) and packages
(`@aquameet/sync`, `@aquameet/entitlements`) follow per the roadmap.

## Consequences

- One verified scoring engine across all clients; tested once.
- Offline resilience is structural (hub + event sourcing), not bolted on.
- A non-native desktop/mobile shell (Electron / React Native) is accepted as the
  cost of the shared-language advantage.
