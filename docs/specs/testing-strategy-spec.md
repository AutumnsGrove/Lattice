---
title: Testing Strategy — Happy, Bad, and Sad
description: How Grove tests three conditions per feature against the real Cloudflare runtime, and the order in which the existing mocks are retired.
category: specs
specCategory: reference
icon: filecode
status: planned
lastUpdated: "2026-11-21"
aliases: []
tags:
  - infrastructure
  - testing
  - quality
---

# Testing Strategy — Happy, Bad, and Sad

```
        ╭──────────────────────────────────────────────╮
        │                                              │
        │    ☀ happy   ──►  the world works            │
        │    ✕ bad     ──►  the caller was wrong       │
        │    ☂ sad     ──►  the world was wrong        │
        │                                              │
        │    all three, against the real runtime       │
        │                                              │
        ╰──────────────────────────────────────────────╯
```

> _A test that cannot fail is not a promise. It is decoration._

This spec replaces `testing-spec.md` (January 2026). It keeps what was true about that
document — the helper library, the config patterns, the trophy — and drops the parts that
turned out to be aspirational bookkeeping: coverage percentages nobody measured, subagent
prompt templates, and a V1 gate that quietly stopped being a gate.

Two things changed since then. Grove now has a real local dev stack that can seed three
tenants and hand out demo logins, which makes end-to-end testing tractable where it wasn't.
And Cloudflare's Workers testing integration reached v1, which means the runtime we deploy
to can be the runtime we test against. Both are the reason this document exists now.

---

## What the audit found

A read-only survey of the repository, taken 2026-11-21, before any of this work began.

| Measure                                | Value            |
| -------------------------------------- | ---------------- |
| Test files (source, no `dist`, no junk) | 425              |
| Test cases (`it` / `test`)             | ~9,947           |
| `describe` blocks                      | 2,695            |
| Vitest configs                         | 29               |
| Playwright configs                     | 1                |
| Snapshot tests                         | 0                |
| **Files asserting any throw or reject** | **93 — 21.8%**  |
| Files with an edge-case `describe`     | 29               |

Where the files live:

| Area              | Test files |
| ----------------- | ---------- |
| `libs/engine`     | 180        |
| `services/heartwood` | 31      |
| `libs/infra`      | 19         |
| **`apps/aspen`**  | **18**     |
| `apps/landing`    | 11         |
| everything else   | 1–13 each  |

Three findings matter enough to name directly.

**The trophy inverted into a pyramid.** The documented philosophy is Guillermo Rauch's
"mostly integration, some unit, few E2E." The practice is ~407 unit files, 15 integration
files under `libs/engine/tests/`, and 3 E2E specs that CI never runs. Unit tests won
because they are cheap and never flake — which is a good reason to write them and a bad
reason to write only them.

**Aspen is the least-tested thing the platform depends on.** Eighteen test files sit
behind 86 `+server` routes and 78 pages. The routes that carry money and identity
(`blooms`, `friends`, `export`, `settings`, `auth/sessions`, `subscriptions`) have tests.
The routes that carry a writer's actual work — rendering, publishing, reading — do not.

**The "in between" is nearly absent.** Roughly four in five test files would not notice if
their error path were deleted. Empty states, partial data, expired sessions, and
reassigned tenants are barely represented, and those are exactly the states a multi-tenant
platform bleeds in.

---

## The three suites

Every feature gets three suites. The names describe who did the wrong thing, not how
severe it is.

### Happy — the world works

The caller did everything right and the system has everything it needs.

- A writer opens their archive and sees their posts
- A comment is posted and appears
- A subscriber upgrades and their tier changes

Happy tests are the ones that exist today. They are necessary and they are the least
interesting, because a feature that fails them fails loudly.

### Bad — the caller was wrong

The request itself was invalid. The system is healthy; the input is not.

- `401` — no session
- `403` — right session, not the owner
- `404` — nothing there
- `400` — malformed body
- `429` — rate limit tripped

Bad tests assert that the boundary holds and the response shape is honest. They are the
ones that stop a leak from becoming a breach.

### Sad — the world was wrong

The caller asked correctly. The system is in a legitimate but degraded state and must
still behave sanely. Nothing here is a bug in the request.

- A list that should be empty returns `[]` — not an error, not a `null`
- A post exists in D1 but its Durable Object was evicted
- A session expires mid-edit
- A tenant's subdomain was reassigned to someone else
- Storage is at 99% of quota
- A downgrade happens mid-billing-period
- A tenant is suspended

Sad tests are where this specification does the most work, because they are where Grove
actually breaks. They are also the hardest to write, because they require thinking about
what the system looks like when it is tired.

### The tenant boundary is a sad test

Because Grove is multi-tenant, one class of sad test deserves its own name. Any route
that touches tenant data must prove four things:

| Case                          | Expected        |
| ----------------------------- | --------------- |
| Right tenant, right data      | `200`           |
| Right tenant, someone's data  | `404`, not `403` |
| No tenant at all              | `401`           |
| Wrong tenant, someone's data  | `404`, not `403` |

The `404`-not-`403` distinction is the point. A `403` on a foreign resource confirms the
resource exists, which is an enumeration oracle. Every tenant-scoped route proves this
once, in its `sad` describe, or it is not done.

---

## Where the suites live

One file per subject. Three `describe` blocks inside it. No file-naming schemes, no
separate directories, no tripling the filesystem.

```
apps/aspen/src/routes/api/friends/friends.test.ts

  ▾ happy
      adds a friend
      lists friends
      removes a friend
  ▾ bad
      rejects an unauthenticated request
      rejects a duplicate
      rejects a malformed body
  ▾ sad
      returns [] for a writer with no friends
      returns 404 when the friend's tenant is gone
      returns 404 for another tenant's friend
```

Rules:

1. **The three block names are literal**: `happy`, `bad`, `sad`, lowercase, no
   decoration. `edge cases` and `error handling` are retired — they name the same thing
   without committing to which of the three it is.
2. **A suite may be absent only if it is impossible**, and then a one-line comment says
   why. A pure formatter has no `bad` and no `sad`; a route always has all three.
3. **`describe` titles inside the block stay behaviour-named** — `adds a friend`, not
   `should test the POST handler`. The existing habit is good; keep it.
4. **Co-location stands.** Tests sit next to what they test. This does not change.

The reason for `describe` blocks rather than separate files is review cost. A reviewer
reading `friends.test.ts` sees all three conditions at once and can tell in seconds
whether the sad path was hand-waved. Splitting them across files hides exactly the gap
this spec exists to close.

---

## The trophy, restated

The trophy still holds. What follows says which layer a thing belongs to, because that
was the ambiguous part.

| Layer              | Grove: what belongs here                                                                 | Volume |
| ------------------ | ---------------------------------------------------------------------------------------- | ------ |
| **Static analysis** | oxlint, eslint, prettier, semgrep, codeql, the pre-commit guards (accent colours, Prism icons, engine barrels) | always on |
| **E2E**            | A real browser, the real local stack, one full journey. Proves the pieces fit.            | a handful |
| **Integration**    | SvelteKit route handlers, Worker entrypoints, Durable Objects — running in the Workers runtime with real bindings | most |
| **Unit**           | Pure functions over primitives. Parsers, formatters, validators, pricing math.            | some |

The decision rule for integration vs unit is mechanical:

> **If the code takes or returns primitives, it goes in the Node pool. If it touches
> `Request`, `Response`, `env`, `ctx`, or a binding, it goes in the Workers pool.**

There is no third case. A function that takes a `Request` and returns a `Response` is not
a unit function, even if it is short.

---

## The real-runtime mandate

Mocks of Cloudflare services are retired. Not deprecated, not discouraged — retired, on a
schedule.

A test that runs against `createMockD1()` proves that Aspen agrees with our idea of D1.
It does not prove Aspen agrees with D1. Every storage mock is a maintained guess about
behaviour we do not control: `prepare().bind().first()` returning `null` versus
`undefined`, `changes` being absent on a failed write, `meta.last_row_id` appearing only
sometimes. When the guess is wrong, the test passes and production fails, and the failure
belongs to the test as much as the code.

**The tooling.** `@cloudflare/vitest-plugin` v1.9.0 — the package formerly named
`@cloudflare/vitest-pool-workers`, renamed in August 2026. It runs tests inside a real
`workerd` isolate via Miniflare: D1 is embedded SQLite, KV is real KV semantics, R2 is
real bucket semantics, Durable Objects are real DOs. No Cloudflare credentials, no
network, no account ID. The configuration API is unchanged across the rename.

The repository currently has `@cloudflare/vitest-pool-workers@^0.13.3` in three packages,
exactly one of which is live (`workers/lumen`). Migration is a dependency and import
rename, plus a codemod for the config.

**The phase order: Aspen, then services, then libs.**

| Phase | Area                   | Test files | Why here first                                        |
| ----- | ---------------------- | ---------- | ----------------------------------------------------- |
| 1     | `apps/aspen`           | 18         | The money path. Smallest surface, largest blast radius. |
| 2     | `services/`, `workers/` | 119        | Each owns its own bindings; each is independently deployable |
| 3     | `libs/`                | 247        | Longest tail. Many are pure logic and stay in Node.    |

Phases 2 and 3 are deliberately unscheduled. Their shape should be set by what phase 1
learns, not guessed now.

### Determining which libraries convert at all

Most of `libs/` is pure logic — `formatBytes`, `slugify`, `gutter`, theme math. Those
stay in plain Vitest with `happy-dom` and they should, because a browser DOM and a
Workers isolate are both slower than nothing.

A library converts when **any** of these is true:

- its tests import from `cloudflare:workers` or `cloudflare:test`
- it declares bindings in a `wrangler.toml`
- it exports code that receives `env` or a `D1Database` / `R2Bucket` / `KVNamespace` type

`libs/thorn`, `libs/curios`, `libs/shutter/cloudflare`, and the `platform/threshold`
stores all qualify. `libs/prism` and `libs/gossamer` do not.

### Durable Objects and service bindings in Aspen

Aspen binds 2 D1 databases, 2 KV namespaces, 3 R2 buckets, 6 Durable Objects, and 3
service bindings (`AUTH`, `ZEPHYR`, `PULSE_COLLECTOR`).

**Durable Objects run for real, in-pool.** They are our code, they are where the
interesting sad paths live (eviction, alarms, concurrent writers), and Miniflare runs them
faithfully enough to be worth testing. Mocking them would defeat the purpose.

**Service bindings are stubbed at the boundary.** They point at other deployments. Booting
Heartwood, Zephyr, and Pulse alongside Aspen for every test costs startup time and buys
fidelity that belongs in their own test suites. The stubs return realistic responses —
including failure responses, because a stub that only ever succeeds cannot test a sad
path.

`workers/lumen` already does this, and its config comment documents why. Phase 1
generalises that pattern into a shared Aspen harness rather than repeating it per file.

---

## End-to-end

Grove has had E2E capability for a while and one suite to show for it:
`services/heartwood/e2e/`, three Playwright specs, 513 lines, covering device flow, OAuth,
and session management. The config is genuinely well-built — Chromium-only for the CDP
virtual authenticator, single worker to avoid rate limiting, dual `webServer` booting
wrangler and Vite, traces on first retry.

CI never invokes it. `test:e2e` exists in `services/heartwood/package.json` and appears in
zero of the 44 workflows. It runs when someone remembers.

That changes, and Aspen gets the first real journey.

### What the first journey proves

One spec, one path, the thing the whole platform is for:

```
seed a tenant
  → open a demo session
    → write a bloom
      → publish it
        → read it as a stranger
          → assert the words appear
```

If that passes, the pieces fit. If it fails, something in the chain is broken and no
amount of unit coverage will say so.

### How it logs in without Google

This is the part that made E2E "tricky" for a long time, and it is already solved.
`scripts/dev-stack.sh` prints a demo login URL per seeded tenant:

```
http://localhost:5173/arbor?demo=<DEMO_MODE_SECRET>&subdomain=<subdomain>
```

`hooks.server.ts` trades that query parameter for a `grove_demo_mode` cookie and the
suite is authenticated. No Google, no OAuth callback, no second browser context. The
three seeded tenants (`midnight-bloom`, plus two others) each get a URL, and
`grove_demo_identity` can switch between their owners without changing the subdomain —
which is precisely what a cross-tenant sad test needs.

Ports, for reference:

| App       | Port |
| --------- | ---- |
| Heartwood | 8787 |
| Aspen     | 5173 |
| Landing   | 5174 |
| Plant     | 5175 |
| Login     | 5176 |

### Where it lives and when it runs

`apps/aspen/e2e/`, mirroring Heartwood's layout, with `playwright.config.ts` and
`tests/`. Path-filtered in CI: it runs when `apps/aspen/**` or `libs/engine/**` changes,
and skips otherwise. The existing CI `detect` job already computes affected packages, so
this reuses it rather than inventing a second filter.

Heartwood's three specs get wired into CI at the same time. Leaving a working suite
uninvoked is worse than having no suite, because it looks like coverage on a graph.

**Seeding is a fixture, not a side effect.** Playwright's `webServer` config can run the
seed command; the suite must not depend on a human having run `dev-stack.sh` first. A test
that only passes on a warm machine is a test that will fail in CI on day two.

### What E2E is not for

E2E does not test validation rules, error codes, or edge cases — those are the three
suites above. It answers one question: does the assembled system work. When it starts
asserting twelve things about a 400 response, it has become a slow, flaky unit test and
should be deleted back down to one journey.

Visual correctness is not E2E either. Glimpse captures screenshots and writes a JSON
sidecar with status, timings, and console output; it asserts nothing. That stays a
human-eyes loop per `VERIFICATION.md`, and this spec does not change it.

---

## Coverage

**Changed lines must be covered. Existing debt does not block.**

CI collects coverage and fails a pull request only when the lines that PR added or
modified are under threshold. A number is measured once as a baseline and never becomes a
gate.

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Metric             | lines, on changed lines only           |
| Threshold          | 70% to start                           |
| Direction          | ratchets up, never down                |
| Existing files     | exempt until converted                 |
| Reporting          | PR comment, per package                |

The reasoning: a global threshold punishes the refactor that deletes dead code, which is
the opposite of what we want. A per-file "must match previous" rule blocks the person
fixing a bug in a file that was never tested. Changed-lines coverage is the only variant
that asks the right question — _is the new thing tested_ — without making anyone pay for
a debt they did not take on.

Coverage is currently configured in three packages (`engine`, `billing-api`,
`heartwood`) with no thresholds and no reporter output. None of it reaches CI.

### What coverage cannot tell us

A file at 100% coverage with only `happy` tests is still a file with no `bad` and no
`sad`. Coverage measures execution, not intent. The three-suite requirement is the real
gate; the percentage is a smoke detector, not the fire code.

---

## Migration plan

### Phase 0 — the harness

Nothing converts until Aspen has a Workers-pool config that boots its real bindings,
runs its real Durable Objects, and stubs its three service bindings. This is one file,
written once, and every later subissue depends on it.

The `@cloudflare/vitest-plugin` rename happens here too, starting with `workers/lumen`
so the pattern is proven on a package that already works.

### Phase 1 — Aspen, thinnest to thickest

The order is chosen so the first subissue is finishable in a single session and the last
one is genuinely hard.

| # | Subissue                          | Why here                                          |
| - | --------------------------------- | ------------------------------------------------- |
| 1 | Harness + `@cloudflare/vitest-plugin` rename | Unblocks everything else               |
| 2 | Read-only routes — home, blog, post, `404` | No writes, no auth. Proves the harness works. |
| 3 | Auth and session routes           | Touches Heartwood; first stubbed service binding  |
| 4 | Publishing a bloom                | The first write. First real DO interaction.       |
| 5 | Settings                          | Tenant-scoped writes, quota, secret handling      |
| 6 | Export                            | R2, `waitUntil`, long-running work                |

Each of 2–6 converts its routes to the harness **and** adds `bad` and `sad` describes.
Conversion without the new suites is not a completed subissue — it would replace mocks
with a real runtime and still leave 80% of the behaviour unproven.

### Phase 2 — services and workers

Unscheduled. Shaped by phase 1's findings. The mock helpers in
`libs/engine/tests/integration/helpers` are deleted as each consumer converts —
`createMockD1`, `createMockR2`, `createMockKV`, `seedMockD1`, `advanceKVTime`. No
compatibility shims; no two ways to do the same thing.

The factories (`createTestUser`, `createTestSession`, `createTestPost`) and the request
event builders (`createMockRequestEvent`, `createAuthenticatedTenantEvent`) survive.
They construct plain objects, they do not pretend to be Cloudflare, and a real-runtime
test still needs them.

### Phase 3 — libs

Unscheduled. Most of it is already correct.

---

## CI changes

| Change                                          | Effect                                  |
| ----------------------------------------------- | --------------------------------------- |
| Coverage collection on affected packages         | PR comment, changed-lines gate at 70%   |
| `apps/aspen/e2e` job, path-filtered              | Runs on Aspen or engine changes         |
| Wire `services/heartwood` `test:e2e` into CI      | The suite that exists starts counting   |
| Delete `test:shell`                               | It points at `scripts/repo/tests/`, a directory that does not exist, for a `bats` runner with zero `.bats` files in the repo |

The `test:shell` entry is a small thing that is worth naming: it is a script that has
never run and cannot run, sitting in `package.json` where it reads as coverage.

---

## Issue structure

One parent issue, native sub-issues under it, one PR per subissue.

The parent states the goal and the phases. Sub-issues are phase 1 only — phases 2 and 3
are described in the parent and filed when phase 1 closes, because their real shape is
not known yet and a backlog of guesses is a backlog nobody trusts.

Draft titles, in plain language per Grove's issue convention (`Service: what happens in
plain english`) — no PKCE, no DO, no SSR in a title:

```
Parent  Aspen: prove the platform with real tests, not mocks

  1. Aspen: run tests against the real Cloudflare runtime
  2. Aspen: test the reading pages with real data
  3. Aspen: test logging in and staying logged in
  4. Aspen: test publishing a bloom
  5. Aspen: test changing site settings
  6. Aspen: test exporting a site
  7. Aspen: one full journey in a real browser
  8. Repo: measure coverage on new code, not old code
```

Sub-issue 1 is the harness. Sub-issue 7 is the Aspen E2E journey. Sub-issue 8 is the
coverage gate, which is orthogonal to the migration and can land any time after the
harness.

Every sub-issue carries the same definition of done:

- [ ] Converted to the Workers-pool harness (if it touches bindings)
- [ ] `happy`, `bad`, and `sad` describes present and named exactly that
- [ ] Tenant-boundary `404`-not-`403` proven, if the route is tenant-scoped
- [ ] Any covered mock helpers deleted
- [ ] Passes in CI on the affected-package matrix

---

## What this spec does not do

- **Does not mandate 80% repo-wide coverage.** That number was in the old spec and it
  never meant anything, because nothing measured it and no one was gated on it.
- **Does not add visual regression testing.** Glimpse stays a capture tool. Baseline
  image diffing is a different project with its own flake profile, and nobody has asked
  for it.
- **Does not touch component testing.** `happy-dom` plus Testing Library stays for
  Svelte components that need a DOM. A Workers isolate is not a browser and pretending
  otherwise would make component tests worse.
- **Does not convert every library.** Pure logic stays in the Node pool, permanently.
- **Does not schedule phases 2 and 3.** They are described, not promised.

---

## Appendix — still true from the old spec

Harvested because it was correct and will keep being correct.

### Test helpers

`libs/engine/tests/integration/helpers` — factories and request event builders. These
survive the migration.

```typescript
import {
	createTestUser, // → TestUser
	createTestSession, // → TestSession
	createTestSubscription, // → TestSubscription
	createTestImage, // → TestImage metadata
	createTestWebhookEvent, // → TestWebhookEvent
	resetFactoryCounters, // call in beforeEach

	createMockRequestEvent, // → full SvelteKit RequestEvent
	createAuthenticatedTenantEvent, // → pre-configured tenant + user
	createMockServiceBinding, // → stub for a service binding
	createMockDONamespace, // → DO namespace stub
} from "../helpers";
```

`libs/engine/tests/utils/test-helpers` — Durable Object fixtures and assertions.

```typescript
import {
	createTestTenant,
	createTestPost,
	resetTestCounters,
	insertTestTenant,
	insertTestPost,
	createJsonRequest,
	parseJsonResponse,
	assertJsonResponse, // → assert 200 + JSON + optional field match
	assertErrorResponse, // → assert error status + optional message match
	cleanupTestData,
} from "../utils/test-helpers";
```

### Mocked-D1 helpers — removed by this spec

```typescript
createMockD1, createMockR2, createMockKV, seedMockD1, clearMockD1, advanceKVTime
```

Do not build on these. They are scheduled for deletion as their consumers convert.

### Config patterns that stay

Engine's `happy-dom` config, the `$app/*` module stubs in `libs/engine/tests/mocks/`,
and the workspace-subpath `resolve.alias` workaround all remain necessary — Vite cannot
follow a workspace package's `exports` map, so imports of sibling packages resolve to
source paths. `workers/lumen/vitest.config.ts` is the working example of both the
Workers-pool shape and the alias workaround in one file.

### Running things

```bash
pnpm test                                  # all packages
pnpm --filter grove-aspen test:run         # one app
pnpm --filter grove-heartwood test:e2e     # Playwright
pnpm test:engine                           # engine only
```

---

_Last updated: November 2026. Supersedes `testing-spec.md`._
