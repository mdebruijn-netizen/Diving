# AquaMeet — Plan v2 (features, design, freemium & licensing)

Status: proposal · Date: 2026-06-10 · Builds on the working codebase (apps:
`web/admin/judge/api/venue-hub`; packages incl. `competition`, `entitlements`,
`control-plane`, `rule-packs`, `ui`). This plan turns the working foundation
into a complete, commercial, DiveRecorder-class product with a polished public
face and a freemium licensing model.

---

## 0. Where we are (honest baseline)

Already real and tested: pure scoring engine + RulePacks (125 tests), the public
magic-link **registration flow**, row-based **dive-sheet entry** with live DD,
the **age-eligibility rule** enforced in 3 places, an **admin** for
competitions/categories/participants/enrolment, a signed **entitlements**
system, and a **plan catalogue**. Deployed on Cloudflare.

Missing for "DiveRecorder-class + commercial": competition structure (sessions /
events / rounds), start lists & draw, qualification, live judging→results wired
end to end, officials/protests, exports, a **marketing homepage**, real **club
accounts/login**, and the **freemium model surfaced** in website + admin.

---

## 1. Positioning & audience

One platform, two modules that work **independently or together**:

- **Infoboard** (Sportity-style): schedule, start lists, live/final results,
  announcements, documents. Works standalone — a club can run only this.
- **Competition** (DiveRecorder-class): meet management + e-judging + results.

Audiences and their surface:

| Audience | Surface | Needs |
| --- | --- | --- |
| Visitor / spectator / parent | Public site + Infoboard | Find a meet, see start lists & live/final results, no login |
| Club / coach / parent (participant) | Magic-link registration | Enter divers + dive sheets for someone else's meet, no account |
| **Club / organiser (host)** | **Club login → Admin** | Create & run own meets (public/private), manage everything |
| Judge | Judge tablet | Score dives, offline-resilient |
| Federation / enterprise | Admin + control-plane | Many meets, officials, qualification, exports, branding, SSO |
| Platform owner (you) | Control-plane back-office | Tenants, plans, licenses, billing |

---

## 2. Freemium & licensing model (surfaced in website + admin)

### 2.1 Value metric
Charge on **what a serious organiser values**, not raw usage: the competition
module + e-judging + scale (concurrent events, judge devices, channels) +
branding. Infoboard stays cheap/free to drive adoption; the **competition
module is the paywall**. This matches the existing `FEATURE_KEYS` and `limits`.

### 2.2 Tiers (refine the existing catalogue)

| | **Free** | **Infoboard** | **Competition Pro** | **Enterprise** |
| --- | --- | --- | --- | --- |
| For | Try-out / tiny club | Clubs wanting only the board | Clubs/regions running real meets | Federations |
| Price (indicative) | €0 | ~€19/mo | ~€79/mo or per-event | Custom |
| Infoboard module | ✓ | ✓ + polls/feedback | ✓ | ✓ |
| Competition module + e-judging | — | — | ✓ | ✓ |
| Synchro scoring | — | — | ✓ | ✓ |
| Live remote results | — | — | ✓ | ✓ |
| External scoreboard / TV | — | — | ✓ | ✓ broadcast |
| Concurrent events | 1 | 2 | 4 | 50 |
| Judge devices | — | — | 20 | 200 |
| Channels | 1 | 5 | 20 | 1000 |
| Branding | AquaMeet badge | club logo | club logo + colors | white-label |
| Support | community | email | priority | SLA + onboarding |

These map 1:1 onto the existing `PLANS` in `packages/control-plane/src/plans.ts`
(`free`, `infoboard`, `competition_pro`, `enterprise`). Keep the IDs; this table
is the marketing/admin presentation of them.

### 2.3 Add-ons (à-la-carte, optional)
- Extra judge devices / channels (raise a `limit`).
- **Per-event pass** — a one-off Competition Pro unlock for a single meet (great
  for clubs that host once a year; lowers the barrier vs a subscription).
- White-label / custom domain.
- Broadcast scoreboard + data API (Enterprise).

### 2.4 How licensing is enforced (already half-built)
- Control-plane issues a **signed `EntitlementDoc`** (Ed25519) per tenant from
  `plan + subscription`, with `expiresAt` + `offlineGraceDays`.
- Every client (web/admin/judge/**venue-hub offline**) verifies the signature
  with an embedded public key → feature gating works air-gapped; a live meet is
  **never blocked** by a lapsed connection (status `active`/`grace`/`expired`).
- **Server-side** gated actions (create synchro event, exceed concurrent-event
  limit, add 21st judge device…) re-check entitlements → can't be bypassed.

### 2.5 How it appears in the product
- **Website:** a `/pricing` page with the tier table, "Start free" CTA, and
  "Talk to us" for Enterprise. Each module page explains value.
- **Admin → Plan & Billing:** current plan, **usage vs limits** (progress bars
  for channels / concurrent events / judge devices), license status badge
  (active / grace N days left / expired), and **Upgrade** CTA.
- **Inline gating:** locked features render with a 🔒 + a small `Pro` badge and
  a tooltip "Upgrade to Competition Pro" instead of disappearing — discovery
  drives upgrades. A shared `<FeatureGate feature="competition.synchro">` UI
  component reads the verified entitlements.
- **Billing:** Stripe Checkout + Customer Portal; a webhook updates the
  control-plane D1 and **re-issues the signed entitlement**. Federations can be
  invoiced manually (license issued by hand) — same signed-doc path.

---

## 3. Design system & the four surfaces

### 3.1 Principles ("solid as if it has existed for 100 years")
1. **Calm and precise over flashy.** Restrained motion, high contrast, generous
   whitespace around dense data. Trust = legibility + consistency.
2. **One visual language everywhere** — reuse `packages/ui` tokens (dark
   `--ink-*` base, `--accent` teal→cyan gradient, `--good/warn/bad`, radii,
   shadows, Inter). The marketing site and the app feel like one product.
3. **Tables done well.** Start lists & results are the core artifact: fixed
   headers, zebra-free clean rows, right-aligned numerics, monospaced scores,
   clear status chips (valid / invalid / no sheet / DNS).
4. **Mobile-first for visitors, density-first for admins.** Same tokens, two
   layouts.
5. **TV mode is first-class** — a dedicated full-screen, glanceable theme with
   big type and auto-advance, not an afterthought.

### 3.2 Homepage (public marketing site) — new
Goal: explain the product in 10 seconds, convert organisers, reassure
federations. Sections, top to bottom:
- **Hero:** one line ("Run diving meets without the chaos — scoring, live
  results and an infoboard that work even when the wifi doesn't."), a calm
  underwater-gradient visual, primary CTA **Start free**, secondary **See a live
  board**.
- **Trust strip:** "World Aquatics scoring", "Offline-resilient poolside",
  "Used by clubs & federations".
- **Modules (2 cards):** Infoboard / Competition — each with 3 bullets and a
  screenshot.
- **How it works (3 steps):** Create a meet → Clubs self-register → Judge & go
  live.
- **Offline-proof** explainer (Venue Hub) — the differentiator vs web-only
  rivals.
- **Pricing** teaser → `/pricing`.
- **Social proof / logos / a results-page demo link.**
- **Footer:** product, federations, docs, status, legal.
- Built as a fast static surface (same stack), SEO + OG tags, public results
  pages are crawlable (good for clubs' visibility).

### 3.3 Admin (organiser/host) — extend current app
Keep the existing app-shell (left sidebar). Navigation grouped:
- **Overview** (dashboard: next session, live status, alerts, plan usage).
- **Competitions** → a competition opens to: **Structure** (Sessions → Events →
  Rounds), **Categories**, **Participants**, **Enrolment / Sign-ups**, **Start
  lists & Draw**, **Run / Live** (judging control), **Results &
  Qualification**, **Officials**, **Protests**, **Exports**, **Settings**
  (public/private, branding, RulePack version).
- **Plan & Billing** (§2.5).
- **Organisation** (members/roles, branding, domains).
A persistent **competition status** state-machine chip (setup → registration →
in progress → finished → archived) anchors the top bar.

### 3.4 Club portal / login — new auth surface
Two distinct club journeys, don't conflate them:
- **Host club (account):** email magic-link **or** password login → lands in
  Admin scoped to their organisation; can create **public or private** meets
  (private = unlisted, access by link/code). Plan/limits apply to the org.
- **Participating club (no account):** unchanged magic-link registration to fill
  divers + dive sheets for a meet they don't host.
A clean **/login** and **/signup** (create organisation) flow; org creation
provisions a tenant on the `free` plan with a signed entitlement.

### 3.5 Visitor (public) — extend infoboard
Mobile-first, no login. A meet's public page: **Schedule**, **Start lists**,
**Live results** (WebSocket from the Session DO), **Final results &
standings**, **Announcements**, **Documents**. A `?tv=1` **TV mode** (full
screen, big type, rotating views) for hall screens/beamers. Private meets need a
link/code; public meets are indexable.

---

## 4. Auth & accounts (new)
- **Organisation = tenant.** Sign-up creates an org + owner on `free`.
- **Roles:** `org_admin`, `competition_admin`, `judge`, `viewer`. Magic-link
  participants are tokens, not accounts.
- Auth via Cloudflare-friendly approach (email magic-link primary; optional
  password; SSO/SAML for Enterprise later). Sessions in KV; tenant routing to
  the per-tenant D1.

---

## 5. Feature roadmap (DiveRecorder breadth)

Data-model additions (per-tenant D1), layered on today's entities:
- **Session** (competition → sessions: morning/afternoon, warm-up/call times).
- **Event** (session → events: discipline+gender+category) with **Rounds**
  (prelim/semi/final), `judgeCount`, `isSynchronised`, `qualificationRule`.
- **StartListItem** (event+round → ordered entries) + **Draw** (random/seeded).
- **JudgePanel** (assign judges/roles to an event+round).
- **ScoringEvent** append-only (already designed) → Session DO → recomputed
  results; **redive** & **manual override** as event types with audit.
- **Qualification** (top-N / cutoff carry prelim→final).
- **Official**, **Protest/Decision** (+ audit log), **Standings** (club/nation).
- **Export** jobs (PDF start lists & results, dive sheets, CSV/Excel, WA/LEN).

Keep the **shared validator** as the single source for valid/invalid across
public sign-up, admin review, and exports.

---

## 6. Phased delivery

**Phase 1 — Commercial shell & accounts (sell + onboard).**
Homepage + `/pricing`; club **sign-up/login** + organisations; **Plan &
Billing** in admin with usage vs limits and inline `<FeatureGate>`; Stripe +
entitlement re-issue. *(Turns it into a SaaS you can put online.)*

**Phase 2 — Competition structure.**
Sessions → Events → Rounds in the data model + admin; wire categories/enrolment
to events; public schedule.

**Phase 3 — Start lists, draw & run-of-play.**
Random/seeded draw; start lists per event/round; "Run/Live" control screen.

**Phase 4 — Live judging end-to-end.**
Judge tablet → Session DO append-only → recomputed results → live infoboard +
TV mode; offline via Venue Hub + outbox reconcile.

**Phase 5 — Qualification, officials, protests.**
Prelim→final carry; officials & panels; protest/decision + audit.

**Phase 6 — Exports & polish.**
PDF/Excel/WA-LEN exports; standings; branding/white-label; performance pass.

---

## 7. What to build first (recommendation)
Start **Phase 1**: it's what makes this a product you can actually sell and what
the brief now asks for (homepage, club login, freemium surfaced). Concretely the
first deliverable is:
1. **Marketing homepage + `/pricing`** in the shared design system.
2. **Club sign-up/login + organisation** (free plan provisioned, signed
   entitlement).
3. **Admin → Plan & Billing** with usage vs limits + inline feature-gating.

Then Phase 2 (structure) so real meets can be built on top.
