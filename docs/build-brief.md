# AquaMeet — Build Brief (for an independent rebuild)

This is a **self-contained specification** of the product, so a second team (or
another AI) can build it from scratch and the result can be compared to this
implementation. It captures the goal, the domain rules, the architecture, and
the exact behaviours that have been agreed so far. Where a real federation rule
is involved it is stated explicitly; everything else is an engineering choice
you are free to improve on.

---

## 1. Product in one paragraph

AquaMeet is a modern rebuild of **DiveRecorder** (springboard & platform diving
competition management and e-judging under World Aquatics rules) with an
integrated **Sportity-style event infoboard**. It must work **with and without**
the competition module, behind a commercial **SaaS licensing** model, across
four clients (mobile, web admin, judge tablet, desktop scoretafel), and be
**fully offline-resilient at the poolside** while the cloud stays the source of
truth.

Primary users:
- **Organiser / federation** — creates competitions, categories, runs the meet.
- **Clubs / coaches / parents** — self-register divers and submit dive sheets.
- **Judges** — score dives on tablets.
- **Public / spectators** — live results + infoboard.

---

## 2. Core domain & scoring (the crown jewel — must be exactly correct)

All scoring math lives in ONE pure, shared package and runs identically on every
client. "Magic numbers" (panel sizes, retain counts, normalisation, rounding, DD
values) are **data in versioned RulePacks**, never hard-coded. Every stored
result records the RulePack version used, so results are reproducible.

- **Individual event scoring:** from the judges' raw scores, drop the highest
  and lowest down to the middle `retain` scores (World Aquatics individual:
  retain 3 of 5/7), sum the retained scores, multiply by `3/retain`
  normalisation, multiply by the dive's **Degree of Difficulty (DD)**, then round
  per the RulePack.
- **Synchronised scoring:** reduce each of the two execution panels (keep 1) and
  the synchronisation panel (keep 3), combine the retained scores, × 0.6, × DD,
  round.
- **DD lookup:** keyed by `(discipline, dive code, position)`. Disciplines:
  `springboard-1m`, `springboard-3m`, `platform-5m`, `platform-7.5m`,
  `platform-10m`. **Positions: A (straight), B (pike), C (tuck), D (free).**
- Provide a **golden-master** test suite plus **property-based** tests for the
  scoring engine. Correctness here is non-negotiable.

---

## 3. Architecture (binding decisions)

1. **TypeScript end-to-end** so the scoring/rule engine is written once and reused
   on Worker, venue hub, desktop, tablet, mobile.
2. **Cloudflare infrastructure:** API on **Workers (Hono)**; live scoring sessions
   on **Durable Objects** (one per session — strongly consistent, WebSocket
   hibernation rooms); **D1** for relational data (one D1 per tenant + a
   control-plane D1); **R2** for documents/exports/video; **KV** for cached
   entitlements/config; **Queues** for push/billing; static frontends served as
   assets; optional **Stream** for live video.
3. **Local-first at the venue:** a **Local Venue Hub** on the venue LAN runs the
   live meet so unreliable public wifi is off the scoring critical path. Scoring
   is an **append-only event log**; results are always recomputed, never patched
   in place. The hub mirrors to the Session Durable Object via an **idempotent
   outbox**; competition data is never silently auto-merged — forks are flagged
   for manual resolution.
4. **Rules are data** — versioned, content-addressable RulePacks.
5. **Multi-tenancy via D1-per-tenant** (no Postgres/RLS) + a control-plane D1 for
   tenants/subscriptions/licenses. Feature entitlements are resolved from the
   plan and enforced on every client; hub/desktop verify a **signed,
   offline-checkable license** so a live meet is never blocked mid-event.

Accepted trade-off: a non-native desktop/mobile shell (Electron / React Native)
is fine as the cost of the shared-language advantage.

---

## 4. Suggested monorepo layout (pnpm workspace, Node 22+)

Packages (pure/shared logic, no UI, fully unit-tested):
- `domain` — scoring engine (individual + synchronised).
- `rule-packs` — RulePack Zod schema, DD lookup, World Aquatics preset.
- `competition` — competition domain entities, validation, formatting,
  eligibility (see §6).
- `persistence` — storage abstraction (D1 + in-memory for tests).
- `sync` — offline event-log / outbox sync primitives.
- `entitlements` — plan → feature resolution + license verification.
- `control-plane` — tenants / subscriptions / plans.
- `infoboard` — Sportity-style infoboard content model.
- `ui` — shared React component kit (Button, Card, Field, Badge, Icon, …).

Apps:
- `api` — Cloudflare Worker (Hono) + Session Durable Object; also serves the
  built frontends as static assets.
- `venue-hub` — local-first hub runtime.
- `admin` — organiser web admin (competitions, categories, participants,
  enrolment, sign-up review).
- `web` — public self-service registration (magic-link, no account) + public
  results.
- `judge` — judge tablet scoring UI.

Tooling: `pnpm typecheck` (per-app tsconfig), `pnpm test` (vitest), an
`assemble-assets` step that copies each built frontend into the Worker's public
dir, and `wrangler deploy`. D1 migrations under `apps/api/migrations`.

---

## 5. Entities (minimum viable model)

```
Competition { id, name, date, endDate?, location?, registrationOpen?, registrationDeadline? }

Registration {           // one self-service sign-up (a club/coach/parent)
  id, competitionId, contactName, contactEmail, clubName?,
  token,                 // opaque secret in the magic link — grants access to THIS registration only
  status: 'open' | 'submitted',
  createdAt
}

Club  { id, name, country? }

Diver { id, firstName, lastName, gender: 'M'|'F'|'X', birthYear, clubId, registrationId? }

CategoryRules { diveCount, maxTotalDd?, requireDistinctGroups?, allowSameDiveTwice? }

Category {               // one result class = gender + age band + discipline
  id, name, gender, ageGroup,           // ageGroup is a label e.g. "E", "12-13", "Open"
  disciplineId,                         // e.g. "springboard-3m"
  rules: CategoryRules,
  competitionId?,
  minBirthYear?, maxBirthYear?          // birth-year band — see §6
}

DiveListItem { code, position: 'A'|'B'|'C'|'D' }
DiveSheet    { entryId, dives: DiveListItem[] }
Entry        { id, diverId, categoryId, registrationId? }   // one entry per diver per category/event
```

Note: a "group" (e.g. group **E**) is represented as one Category **per
discipline/event** (E-1m, E-3m, E-platform). A diver therefore has one Entry +
one DiveSheet per event — i.e. **one dive list per event**.

---

## 6. Age-group eligibility rule (IMPORTANT — explicit federation-style rule)

Clubs choose the group themselves, but with a hard floor:

> A diver may register for **their own age group or an older / harder group**,
> but **never for a younger / easier group.**

Model it as a birth-year band on each Category:
- `minBirthYear` = the earliest birth year in the band (the **oldest** children).
- `maxBirthYear` = the latest birth year (the **youngest** children).

Because older children have earlier birth years, the only bound that matters for
eligibility is the lower one:

```
eligible(diver, category) :=
  category.minBirthYear === undefined  ||  diver.birthYear >= category.minBirthYear
```

- "Own group" = `minBirthYear <= birthYear <= maxBirthYear` (flag it in the UI).
- Worked example: groups E = born 2016–2017, D = 2014–2015, C = 2012–2013.
  A diver born **2017** (group E) may enter E or move **up** to D/C, but a diver
  born **2015** (group D) may **not** drop into the younger/easier group E.
- Bands are **optional** (omit ⇒ no age limit; backwards compatible).

Enforce this in **three** places: filter the category picker in the public
sign-up per diver; **enforce server-side** in the API when an entry is created
(reject with `age_not_eligible`); and offer only eligible divers in the admin
enrolment screen.

---

## 7. Self-service registration flow (public `web` app)

Magic-link, **no account required**:

1. Club opens a competition with `registrationOpen` and provides
   contact/club info → server creates a `Registration` with a `token` and
   returns the magic link `…/web/#/r/<token>`.
2. On that page the club:
   - adds **divers** (first/last name, gender, birth year);
   - for each diver, **adds a program** = chooses an eligible group/event
     (Category) and fills the **dive sheet**.
3. **Dive-sheet input** must be friction-free: render **one row per required
   dive** (sized to `category.rules.diveCount`), each row with a **numeric code
   field** (3–5 digits, must be comfortably wide) and a separate **position
   dropdown (A/B/C/D)** — never require a space-separated free-text format. Show
   the per-dive **DD** as the user types, plus the running **total DD** and a
   live **valid/invalid** verdict against `CategoryRules`.
4. **Submit** locks the registration (`status: 'submitted'`). Guard it: disable
   submit until at least one program exists, and ask for confirmation.
5. **Reopen:** a submitted registration can be reopened (back to `open`) so the
   club can still add/correct programs — do not lock people out permanently.

Validation rules a sheet must satisfy (from `CategoryRules`): exact `diveCount`;
optional `maxTotalDd` cap; optional minimum number of distinct dive groups;
optional "no repeated dive". All validation uses the shared engine + DD table so
the public preview matches the official result.

---

## 8. Organiser admin (`admin` app)

- CRUD **Competitions** (incl. `registrationOpen`, deadline, multi-day dates).
- CRUD **Categories** with gender, age-group label, discipline, `diveCount`, and
  the optional **birth-year band** (Born-from / Born-until); show the band in the
  category list.
- **Participants** (divers/clubs) management.
- **Enrolment** — enter divers into categories and edit their sheets; only show
  divers eligible for the chosen category (§6).
- **Sign-ups** review — list self-registered clubs per competition, drill into
  their entries, show per-entry status (no sheet / valid / invalid) using the
  shared validator.

---

## 9. Judge tablet (`judge` app) & live scoring

- Numeric scorepad per judge; scores feed the **append-only event log** in the
  Session Durable Object; results recomputed by the shared engine.
- Must work over the venue LAN against the hub when the cloud is unreachable, and
  reconcile via the idempotent outbox afterwards.

---

## 10. Infoboard (Sportity-style)

- Event info, schedule, start lists, live/final results, announcements, documents
  — public, mobile-first, works standalone (even when the competition module is
  not licensed for a tenant).

---

## 11. Non-functional requirements

- Offline resilience is **structural** (hub + event sourcing), not bolted on.
- Every result is reproducible (records RulePack version).
- Entitlements enforced on every client; live meet never blocked mid-event by a
  license check (signed, offline-verifiable).
- Strong typing end-to-end; pure domain packages have no platform dependencies.
- Test bar: golden-master + property tests for scoring; unit tests for
  eligibility/validation; typecheck per app.

---

## 12. What to deliver for the comparison

1. The scoring engine + RulePack with passing golden-master/property tests.
2. The public self-service registration flow incl. the **row-based dive-sheet
   input** and the **age-eligibility rule** enforced client- AND server-side.
3. The organiser admin (competitions, categories w/ birth-year bands, enrolment,
   sign-up review).
4. A judge scoring screen wired to an append-only log.
5. A short note on how offline/hub sync and entitlements would be implemented.

Compare on: correctness of scoring, fidelity to the age-eligibility rule,
quality/ergonomics of the dive-sheet entry UX, and how cleanly the
offline/local-first and multi-tenant licensing concerns are separated.
