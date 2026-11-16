# Handoff — Signup abuse hardening (2026-11-17)

Start here next time. This slice is the cluster of issues about bot signups
coming through the email path (#1677, #1678, #1679, #1680, #1681, #1682, #1683,
#1684) plus two findings filed along the way (#1691, #1692).

## Shipped and merged

| PR | what it closed |
|---|---|
| #1694 | **#1683** — deleted the per-IP free-account limiter. It never ran (`free_account_creation_log` does not exist in prod) and would not have caught the incident anyway: one operator, two accounts two hours apart, plus aliases in one inbox. Identity counting is #1681's job now. |
| #1696 | **#1677 part 1+3** — `TenantDO.refreshConfig()` clears on a D1 miss, so a deleted or suspended tenant stops serving. Plus `POST /tenant/flush/:subdomain` behind `OPS_ADMIN_KEY`, and a "Spam Tenant / Link Farm" section in `docs/security/incident-response-runbook.md`. |
| #1698 | **#1680** — `gw tenant list / show / suspend / resume`. `delete` was split out to #1596 §B. Suspend flips `tenants.active`, writes `audit_log`, then probes the site and prints the status code. |
| #1699 | **#1681** — `signup_blocks` deny list keyed on normalized identity (lowercased, `+alias` dropped). Enforced at OTP send, at user creation (covers OAuth), and at `createTenant`. Managed with `gw block add|list|rm`. |
| #1700 | **#1681 follow-up** — the block now actually reaches the client. Better Auth wraps `sendVerificationOTP` in `runInBackgroundOrAwait()`, which swallows throws and still answers `{"success":true}`; enforcement moved to a `hooks.before` middleware where it returns a real 403. |

**Applied to production:** migration `123_signup_blocks.sql` on `grove-engine-db`, and two live blocks — `mail.grokbot.com` (`incident:2026-11-14`) and `upsampler.com` (`incident:2026-11-07`).

## Shipped after that handoff (same day)

| PR | what it closed |
|---|---|
| #1701 | **#1678** — Turnstile on Plant signup. `/verify` step, verify endpoint setting the shared `grove_verified` cookie, and every write path gated: `/profile` + `/plans` **form actions** (not just loads), `/checkout`, `/comped`, `/api/claim-comped`, `/api/save-profile`, `/api/select-plan`. First review caught that only loads were gated; second pass was clean. |
| #1702 | **#1682** — nofollow for link spam. Free-tier and <14-day tenants render outbound links as `rel="nofollow ugc"`; young accounts also get `<meta robots="noindex">`. One helper decides (`libs/engine/security/link-policy`), one applies (`grove-markdown`'s `externalLinkRel`, which also de-duplicated four copies of the tabnabbing logic). `createdAt` now reaches the renderer via TenantDO config → hooks → `TenantInfo`. AUP §3.2 documents the rule. |

**Verified in production:** a blocked address on the OTP endpoint returns `403` with the intended copy (both `mail.grokbot.com` and `upsampler.com`), confirming #1700's fix — the deny list reaches the client instead of answering `{"success":true}`.

Also fixed in passing: `import("dompurify").then()` in both sanitizers had no `catch` and assumed `module.default` had `addHook`, so a misresolved module produced an unhandled rejection *after* every test passed (green report, non-zero exit). Guarded in both copies.

## Open, in flight

- **#1701** — `feat(plant): gate signup behind the Turnstile that was already configured` (#1678). Open PR, CI running at handoff time. Wires the configured-but-unused `TURNSTILE_SITE_KEY` into a `/verify` step, sets the same `grove_verified` cookie Aspen uses, and gates `/profile`, `/api/save-profile` and `/api/select-plan`. Known gaps are in the PR body: not tested against a real challenge, and `user_onboarding` rows are still created in `/auth/callback` before the gate.

## Next, in the order agreed

1. **#1682** — strip the SEO value: `rel="nofollow ugc"` (and maybe `noindex`) for young or free-tier tenants. The highest-leverage remaining item — it costs a spammer their payoff and survives email rotation. Needs `created_at`/age available to the renderer, which means adding a field to the cached `TenantDO` config (same cache as #1677). Two sanitizers exist: `libs/grove-markdown/src/utils/sanitize.ts` and `libs/engine/src/lib/utils/sanitize.ts` — one helper, not three templates.
2. **#1596 §B** — the tenant-table registry + `removeTenant()`. Blocking #1677's last criterion (evict the DO as part of removal) and `gw tenant delete`.
3. **#1684** — HawkAgent layer 1 only (deterministic signals + verdict table), after #1681's table exists and #1606's review queue.
4. **#1679** — the client IP never reaches Heartwood. Not on the abuse critical path any more (nothing counts by IP after #1683), but every `ba_session.ip_address` is still one of two constants and every per-IP limiter is a global bucket.

## Decisions made, so nobody re-litigates them

- **Per-IP limiting is the wrong axis** — deleted, not fixed. Identity (email/domain) is what an operator cannot cheaply rotate.
- **One narrow `signup_blocks` table**, not a polymorphic identity table. #1684 gets its own verdict table later, sharing `normalizeIdentity()`.
- **Blocks are managed by CLI now**, Arbor UI arrives with #1684's review queue.
- **Fail open, loudly** on a deny-list read error — a broken list must not lock every writer out, but it logs an admin error rather than hiding (the #1683 lesson).
- **Migrations are applied by hand** with `wrangler d1 execute --file`, never `migrations apply` — see #1692.

## Two findings that need their own issues

- **#1692** — `d1_migrations` claims `053` and `116` are applied; production's schema says otherwise. 116 is the migration written to repair exactly that gap, and it is logged applied with the table unchanged. The ledger is not evidence.
- **#1691** — 053's other half: `last_activity_at`, `reclamation_status`, `reclaimed_accounts` and the reclamation cron do not exist, while `updateLastActivity()` writes that column on every post save and image upload and swallows the error. Filed for later, per Autumn's call.
- **Not filed yet:** the same Better Auth swallowing that #1700 fixed means `LOGIN_CODE_SEND_FAILED` and `LOGIN_CODE_RATE_LIMITED` never reach users either — the comment claiming "a delivery failure should reach the user" has been false. Worth an issue.

# Handoff — Code review sweep, next slice (2026-09-08)

Start here next time. The Plant local-dev/signup handoff from 2026-08-24 is
fully closed out (see "Previous handoff, closed" below). This doc also
covers two slices of the chunk-by-chunk code review sweep tracked in
**GH #1583** finished across this and the prior session — see
"Slices completed" below for what's left to pick up next.

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

## Slice completed this session: `services/heartwood/src/middleware`

All 6 files reviewed (bearerAuth, cookieAuth, cors, csrf, rateLimit,
security). Findings posted to
[issue comment](https://github.com/AutumnsGrove/Lattice/issues/1583#issuecomment-5589192521):

- **HIGH** — `cookieAuth.ts`'s `adminCookieAuth()` never checked ban status
  on any of its 3 auth paths (Bearer, `grove_session`→SessionDO, `access_token`
  cookie fallback) — `isUserAdmin` only checks `is_admin`/Wayfinder email, not
  `ba_user.banned`. Same bug class as `user.ts`'s L-2 finding two chunks ago,
  but that fix stayed local to `user.ts` and never propagated here. A banned
  admin's still-valid credential kept full `/admin/*` access. Fixed by
  extracting `isUserBanned` out of `user.ts` into `db/queries/admin.ts`
  (shared, exported via barrel) and calling it on all 3 paths in
  `cookieAuth.ts` before the admin check.
- **LOW** — Path 3's cookie read used an unanchored regex
  (`/access_token=([^;]+)/`), matchable as a substring inside any cookie name
  ending in `access_token=`. Not currently exploitable (no colliding cookie
  name exists in the repo) but the exact-match `parseCookieHeader` helper
  already exists for this reason — switched to it, added a regression test.
- **LOW** — `cors.ts` had no `Vary: Origin` on its dynamic per-origin CORS
  response. Confirmed non-exploitable today (no caching layer anywhere in
  the worker) but added as standard hardening.
- `bearerAuth.ts`, `csrf.ts`, `rateLimit.ts`, `security.ts` — no findings,
  already well-tested.
- **Noted, not fixed**: `adminCookieAuth()` has no CSRF/Origin check wired
  in — moot today since its only caller (`admin.ts`) is GET-only, but a
  latent risk if a mutating admin route is ever added under the same
  `admin.use("/*", adminCookieAuth())` pattern.
- Added `cookieAuth.test.ts` (15 tests, was zero coverage). 644/644 tests
  passing (up from 632), typecheck and lint clean.

## Next slice, planned: `db/queries/`, split in two

1,514 loc across `services/heartwood/src/db/queries/` — **zero test files
across the entire directory**, routes only exercise it indirectly through
mocked `createDbSession`. Per the split already scoped last session:

- **Group A** (identity/auth-flow): `users.ts`, `auth-flow.ts`, `sessions.ts`,
  `device-codes.ts`, `clients.ts` — ~849 loc.
- **Group B** (account/billing): `admin.ts`, `audit.ts`, `subscriptions.ts`,
  `rate-limiting.ts` — ~603 loc. Skip `index.ts`, it's a barrel.

Do group A first — it's the auth-critical half and continues the "who is
this user, which table backs them" thread from `user.ts`/`middleware/`.

**After `db/queries/` (both groups):**
1. `db/session.ts` + `db/auth.schema.ts` (278 loc, covered via
   `queries.test.ts` already — small enough for one pass).
2. `heartwood/src/lib` + `services` + `durables` + `auth` + `utils` (needs
   its own real-size rescope when we get there — the issue's "4.6k" figure
   is stale, same as `db`+`middleware`'s "4.1k" was).

Watch for the same recurring patterns: logout/session-revocation gaps, the
`users`/`ba_user` table split, tests that mock away the auth check itself,
and now also **ban-check gaps on any auth path that doesn't route through
the shared `isUserBanned`/`isUserAdmin` pair** — this is the third time
this exact bug class has shown up (`user.ts`, then `cookieAuth.ts`), so
check every raw `SELECT ... FROM users`/`ba_user` in `db/queries/` for
whether it should be going through the shared helpers instead.

Beyond `heartwood` entirely, the issue's next 🔴 security-critical items in
priority order are `libs/grove-crypto` (884 loc), `libs/thorn` (2.9k loc),
`services/billing-api` (7.6k loc) — those loc counts haven't been
rescoped yet either; verify with `wc -l` before committing to a slice size.

## How to resume

1. Pull the issue fresh (`gh issue view 1583 --comments`) in case anything
   landed since this doc was written.
2. Review `db/queries/` group A first (`users.ts`, `auth-flow.ts`,
   `sessions.ts`, `device-codes.ts`, `clients.ts`, ~849 loc) — no test files
   exist for any of it yet, so budget time for writing coverage alongside
   the review, not just fixing bugs.
3. Fix what's found in the same session unless it's cross-cutting/needs
   sign-off (see `betterAuth.ts`'s CORS fix vs. `verify.ts`'s
   deliberately-flagged-not-fixed introspection auth gap for the pattern
   to follow).
4. Comment on #1583 with findings + fixes, using the same structure prior
   comments use (severity-grouped, "Noted, not fixed" section if
   applicable, test coverage note, verification line, "Next:" pointer).
5. The `services/heartwood` parent checkbox on the issue stays unchecked
   until `db/queries/` group B and
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
