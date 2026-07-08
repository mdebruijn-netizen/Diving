# @aquameet/admin

Admin surface (Vite + React). The MVP is the **dive-sheet validation tool**: a
coach enters a dive list (one `code position` per line, e.g. `5253 B`) and sees,
live, whether it is legal for a category — required dive count, distinct-group
coverage, unknown dives, duplicates and an optional total-DD cap — checked
against the official FINA 2017–2021 DD table.

It catches illegal sheets before the meet rather than at poolside.

## Development

```bash
pnpm --filter @aquameet/admin dev
pnpm typecheck
pnpm test   # runs the parse + validation view-model tests
```

Event/category/entry management screens (backed by a persistence API) build on
the same `@aquameet/competition` domain and follow next.
