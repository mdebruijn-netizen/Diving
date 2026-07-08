# AquaMeet

Diving competition management, e-judging and event infoboard — a modern rebuild
of DiveRecorder with an integrated Sportity-style infoboard, on Cloudflare.

Works **with and without** the competition module, behind a SaaS licensing model,
across mobile / web-admin / judge-tablet / desktop clients, and is **fully
offline-resilient at the poolside** with the cloud as source of truth.

See [`docs/adr/0001-architecture.md`](docs/adr/0001-architecture.md) for the
binding architecture decisions.

## Monorepo layout

| Package | Purpose |
| --- | --- |
| `packages/domain` | Pure, shared scoring engine (individual + synchronised diving). |
| `packages/rule-packs` | Versioned RulePack schema, DD lookup and federation presets (World Aquatics). |

Apps (`apps/api` Worker + Session Durable Object, `apps/venue-hub`, clients) and
further packages (`@aquameet/sync`, `@aquameet/entitlements`) are added per the
roadmap.

## Development

Requires Node 22+ and pnpm 10+.

```bash
pnpm install
pnpm typecheck   # type-check all packages
pnpm test        # run the scoring golden-master + property tests
```

### Scoring model (quick reference)

- **Individual:** drop highest/lowest to the middle `retain` scores (World
  Aquatics: 3), sum, ×`3/retain` normalisation, × Degree of Difficulty, round.
- **Synchronised:** reduce each execution panel (keep 1) and the synchronisation
  panel (keep 3), combine the retained scores, × 0.6, × DD, round.

All "magic numbers" (panel sizes, retain counts, normalisation, rounding, DD
values) are **RulePack data**, not hard-coded.
