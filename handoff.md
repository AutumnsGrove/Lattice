# Handoff — Code review sweep, next slice (2026-09-08)

Start here next time. The Plant local-dev/signup handoff from 2026-08-24 is
fully closed out (see "Previous handoff, closed" below). This doc also
covers a slice of the chunk-by-chunk code review sweep tracked in
**GH #1583** that got finished within this same session — see
"Slice completed this session" below for what's left to pick up next.

## Where the audit stands

GH #1583 ("Targeted code review sweep: chunk-by-chunk across the monorepo")
is the live source of truth — not `docs/audits/stability-audit-plan.md`
(untracked, dated 2026-05-20, a much bigger abandoned 30-slice "read every
file" plan). Ignore that file; don't let it get committed or confused with
the real tracker.

**Done so far** (11 comments on the issue, chronological):

1. `services/grove-router` (338 loc) — clean.
2. `services/heartwood/src/routes` — 10 of 13 files reviewed:
   - `session.ts`, `token.ts`, `device.ts`, `cdn.ts` — reviewed, fixed.
   - `subscription.ts` — **2 CRITICAL** (self-serve tier upgrade + `count`
     paywall bypass), both fixed. Tests had been asserting the vulnerable
     behavior as correct.
   - `admin.ts` — HIGH (NaN pagination bound dumped entire users table),
     fixed.
   - `status.ts` — **deleted**, not fixed. 20 issues found (2 HIGH, 6
     MEDIUM, 12 LOW) but zero production callers — traced every reference,
     confirmed dead, removed rather than hardened.
   - `betterAuth.ts` — HIGH x3: sign-out never cleared `grove_session`,
     2FA bridge used the pre-verification session (one config flag from a
     live bypass), CORS wildcard on `*.grove.place` closed.
   - `user.ts` — HIGH: avatar/preference writes silently no-op'd for
     Better-Auth-only accounts (`users` vs `ba_user` table split), fixed.
   - `verify.ts` — HIGH: `/logout` only revoked refresh tokens, never
     SessionDO/Better Auth/D1 sessions or cookies. Same bug class as
     `betterAuth.ts`'s sign-out gap. Fixed; also wired up a fully-built
     rate limiter nobody had imported.

**Recurring patterns across this whole sweep, worth watching for in
upcoming files:**
- **Logout/session revocation gaps** — two separate route files each only
  revoked *one* of the several session mechanisms in play (SessionDO,
  Better Auth, legacy D1, refresh tokens, cookies). Check any
  session-touching code in `health.ts`/`settings.ts`/`login.ts` for the
  same shape.
- **`users` vs `ba_user` split** — the Better Auth migration left two user
  identity tables; several files silently assumed one or the other.
  `settings.ts` is called out in the `user.ts` writeup as hitting the same
  duplication — expect to find it there too.
- **Tests mocking away the auth check itself** — the single most common
  root cause of a shipped bug surviving review. `admin.ts` and
  `betterAuth.ts` both had suites that mocked auth to an unconditional
  pass, meaning zero 401/403 assertions existed. Check this first in each
  new file's test suite before reading the route logic.
- **CORS wildcard on `*.grove.place`** — already closed in `cors.ts`
  itself, but worth a quick re-check anywhere a file references CORS
  directly instead of the shared middleware.

## Slice completed this session: `health.ts` + `settings.ts` + `login.ts`

Closes out `services/heartwood/src/routes` (13/13 files now reviewed).
Findings posted to
[issue comment](https://github.com/AutumnsGrove/Lattice/issues/1583#issuecomment-5589019489),
fixes in commit `6b0044428`:

- **MEDIUM** — `GET /health/replication` was unauthenticated and leaked D1
  replication internals (region, row counts, query duration, session
  bookmark) to any caller. Gated behind the existing fail-closed
  `SERVICE_SECRET` pattern (matches `session.ts`/`subscription.ts`). Base
  `/health` stays open — Clearing's uptime monitor depends on it.
- **LOW** — both health handlers swallowed caught DB errors with zero
  logging; added `console.error`. `settings.ts`'s template had one
  unescaped character (avatar-initial fallback) among otherwise-consistent
  `escapeHtml` usage; not exploitable, fixed for consistency.
- `login.ts` — no findings. Simple hardcoded-host redirect, no open-redirect
  surface, existing test coverage already solid.
- The `settings.ts` file turned out to just be an unauthenticated
  HTML-render route (login prompt vs. account page) — it does **not**
  actually hit the `users`/`ba_user` split predicted from `user.ts`'s
  writeup. That prediction didn't pan out; worth remembering this file
  name is reused/ambiguous if it comes up again elsewhere in the sweep.
- 632/632 tests passing (up from 629), typecheck and lint clean.

## Next slice, planned and confirmed: `services/heartwood/src/middleware`

The issue's own loc counts for the two remaining `heartwood` sub-chunks
(`db`+`middleware` at "4.1k", `lib`+`services`+`durables`+`auth`+`utils` at
"4.6k") are stale — from 2026-08-28. Rescoped `db`+`middleware` with real
counts before picking a next slice:

| Area | Files | Source LOC | Test coverage |
|---|---|---|---|
| `middleware/` | 6 (cors, csrf, bearerAuth, cookieAuth, rateLimit, security) | 826 | **`cookieAuth.ts` has zero tests** — despite being one of the admin-check paths already flagged twice (`admin.ts`, and the "who is an admin" unification note) |
| `db/queries/` | 10 (users, sessions, auth-flow, admin, subscriptions, clients, device-codes, audit, rate-limiting, index) | 1,514 | **Zero test files across the entire directory** — routes only exercise it indirectly through mocked `createDbSession` |
| `db/session.ts` + `db/auth.schema.ts` | 2 | 278 | covered via `queries.test.ts` |
| `db/queries.ts` | — | 104 | just a re-export barrel (`export { ... } from "./queries/index.js"`) — no logic, skip entirely |
| `db/migrations/` | SQL | 587 | schema-correctness lens, not a code review target — lower priority, handle separately if at all |

**Decision (confirmed with Autumn 2026-09-08): `middleware/` next.** Reasoning:
it's the tightest, highest-blast-radius unit — every request passes through
some subset of these 6 files — and it directly continues the "who
determines admin/auth" thread from the `admin.ts` and `betterAuth.ts`
findings. `db/queries/` is bigger raw risk (zero tests on the entire SQL
layer) but 1,514 loc needs splitting into two ~750-loc sub-slices when its
turn comes — don't attempt it in one sitting.

**After `middleware/`, in order:**
1. `db/queries/` split in two — group A (identity/auth-flow: `users.ts`,
   `auth-flow.ts`, `sessions.ts`, `device-codes.ts`, `clients.ts`, ~849 loc)
   and group B (account/billing: `admin.ts`, `audit.ts`, `subscriptions.ts`,
   `rate-limiting.ts`, ~603 loc; skip `index.ts`, it's a barrel).
2. `db/session.ts` + `db/auth.schema.ts` (278 loc, small enough for one pass).
3. `heartwood/src/lib` + `services` + `durables` + `auth` + `utils` (needs
   its own real-size rescope when we get there — the "4.6k" figure is
   equally stale).

Watch for the same recurring patterns flagged in the `routes/` sweep:
logout/session-revocation gaps, the `users`/`ba_user` table split, and
tests that mock away the auth check itself (check test files first — the
`cookieAuth.ts` gap above is exactly this pattern, just with zero tests
rather than a mocked-away one).

Beyond `heartwood` entirely, the issue's next 🔴 security-critical items in
priority order are `libs/grove-crypto` (884 loc), `libs/thorn` (2.9k loc),
`services/billing-api` (7.6k loc) — those loc counts haven't been
rescoped yet either; verify with `wc -l` before committing to a slice size.

## How to resume

1. Pull the issue fresh (`gh issue view 1583 --comments`) in case anything
   landed since this doc was written.
2. Review `services/heartwood/src/middleware`'s 6 files (826 loc). Start
   with `cookieAuth.ts` given its test-coverage gap, then the other 5.
3. Fix what's found in the same session unless it's cross-cutting/needs
   sign-off (see `betterAuth.ts`'s CORS fix vs. `verify.ts`'s
   deliberately-flagged-not-fixed introspection auth gap for the pattern
   to follow).
4. Comment on #1583 with findings + fixes, using the same structure prior
   comments use (severity-grouped, "Deliberately not fixed" section if
   applicable, test coverage note, verification line, "Next:" pointer).
5. The `services/heartwood` parent checkbox on the issue stays unchecked
   until `db/queries/` (both sub-slices) and
   `lib`+`services`+`durables`+`auth`+`utils` are also done — check it once
   the last of those lands.

## Previous handoff, closed (Plant local dev + signup, 2026-08-24)

Everything in the prior handoff's "before diving into polish" checklist is
verified done, most of it by Autumn clicking through manually rather than
automated testing:

- **`tenant-url.ts` fix** — confirmed working. Clicking "Visit My Blog"
  correctly routed to `localhost:5173` (proved indirectly: it collided with
  an unrelated local process — Polaris — squatting that port, rather than
  going to production `grove.place`, which is exactly what the fix was
  supposed to prevent).
- **Full Wanderer signup → tenant → post flow** — done in a real browser.
  New tenant `swag-swag-swag2` created on the `wanderer` plan, confirmed in
  D1 with correct FK/CHECK-constraint behavior (migrations 116/117 from
  that session hold up). A real post (`a-long-time`, published, 5 words)
  was written in Arbor and verified saved with both markdown and rendered
  HTML content, correct `storage_location`, and reachable at its public
  route.
- **Landing's local build issue** — did not reproduce this session; built
  clean.

Two minor **local-only** findings from this session, explicitly not worth
issues per Autumn: a CSP violation blocking `Lexend-Regular.ttf` from
`cdn.grove.place` on Plant (`font-src` not set, falls back to
`default-src 'self'`), and a `TenantDO` "SQL not enabled" Loom error on
Aspen that falls back to D1 gracefully (likely stale local DO storage
state from before a Loom migration).

Also: if `apps/aspen`'s port 5173 is ever unreachable during local dev,
check for `Polaris/web`'s `vite dev` running on the same port before
assuming Aspen itself failed — `wrangler dev`'s fatal-address-in-use crash
prints late in the log and the dev-stack script's "All workers ready"
banner doesn't re-verify bind success.
