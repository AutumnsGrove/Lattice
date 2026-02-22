---
title: "Cloudflare Deployment Safari — Pages vs Workers Audit"
status: planned
category: safari
---

# Cloudflare Deployment Safari — Pages vs Workers Audit

> Every Grove deployment, observed in its natural habitat.
> **Aesthetic principle**: Unified observability, reduced operational surface area.
> **Scope**: All 23 active wrangler.toml configurations — deployment type, bindings, capabilities, Vista coverage.

---

## Ecosystem Overview

**23 deployments** across the Grove platform:

- **8 Cloudflare Pages** — SvelteKit apps with `@sveltejs/adapter-cloudflare`
- **15 Cloudflare Workers** — Service workers, cron workers, DO hosts

### By deployment type

**Pages** (SvelteKit, `pages_build_output_dir`): Engine, Landing, Plant, Meadow, Login, Clearing, Domains, Terrarium
**Workers — Services** (`main`, HTTP-accessible): Heartwood, Grove Router, Durable Objects, OG Worker, Zephyr, Pulse, Email Render
**Workers — Cron** (`main` + `[triggers]`): Email Catchup, Onboarding Emails, Post Migrator, Clearing Monitor, Meadow Poller, Timeline Sync, Vista Collector, Webhook Cleanup

---

## The Complete Landscape

### Cloudflare Pages Projects

| #   | Package              | Script Name       | Domain                       | Bindings                                       | Complexity    |
| --- | -------------------- | ----------------- | ---------------------------- | ---------------------------------------------- | ------------- |
| 1   | `packages/engine`    | `grove-lattice`   | `*.grove.place` (via router) | D1, R2×3, KV×2, AI, Auth svc, Zephyr svc, DO×6 | **Very High** |
| 2   | `packages/landing`   | `grove-landing`   | `grove.place`                | D1, R2, KV×2, Auth svc, Zephyr svc             | **High**      |
| 3   | `packages/plant`     | `grove-plant`     | `plant.grove.place`          | D1, KV, Auth svc, Zephyr svc                   | **Medium**    |
| 4   | `packages/meadow`    | `grove-meadow`    | `meadow.grove.place`         | D1, KV, Auth svc, DO×1                         | **Medium**    |
| 5   | `packages/clearing`  | `grove-clearing`  | `status.grove.place`         | D1×2                                           | **Low**       |
| 6   | `packages/domains`   | `grove-domains`   | Forage tool                  | D1, Auth svc                                   | **Low**       |
| 7   | `packages/login`     | `grove-login`     | `login.grove.place`          | Auth svc only                                  | **Minimal**   |
| 8   | `packages/terrarium` | `grove-terrarium` | TBD                          | None (localStorage)                            | **Minimal**   |

### Cloudflare Workers

| #   | Package                             | Script Name               | Type            | Cron                       | Bindings                                      |
| --- | ----------------------------------- | ------------------------- | --------------- | -------------------------- | --------------------------------------------- |
| 1   | `packages/heartwood`                | `groveauth`               | Service         | `* * * * *`, `0 0 * * *`   | D1×2, R2, KV, DO, Zephyr svc, Smart Placement |
| 2   | `packages/grove-router`             | `grove-router`            | Service         | `* * * * *`                | R2×2, Scout/Auth/MC/Mycelium/OG svcs          |
| 3   | `packages/durable-objects`          | `grove-durable-objects`   | DO Host         | —                          | D1×2, R2×2, KV, AI, Zephyr svc                |
| 4   | `packages/og-worker`                | `grove-og`                | Service         | —                          | KV                                            |
| 5   | `workers/zephyr`                    | `grove-zephyr`            | Service         | —                          | D1, Email Render svc                          |
| 6   | `workers/pulse`                     | `grove-pulse`             | Service+Cron    | `0 * * * *`, `5 0 * * *`   | D1, KV                                        |
| 7   | `workers/email-render`              | `grove-email-render`      | Service         | —                          | None (stateless)                              |
| 8   | `workers/email-catchup`             | `grove-email-catchup`     | Cron            | `0 10 * * 0`               | D1, Email Render svc                          |
| 9   | `landing/workers/onboarding-emails` | `grove-onboarding-emails` | Cron            | `0 10 * * *`               | D1                                            |
| 10  | `packages/post-migrator`            | `grove-post-migrator`     | Cron (disabled) | —                          | D1, R2                                        |
| 11  | `packages/workers/clearing-monitor` | `grove-clearing-monitor`  | Cron            | `*/5 * * * *`, `0 0 * * *` | D1, KV                                        |
| 12  | `packages/workers/meadow-poller`    | `grove-meadow-poller`     | Cron            | `*/15 * * * *`             | D1, KV                                        |
| 13  | `packages/workers/timeline-sync`    | `grove-timeline-sync`     | Cron            | `0 1 * * *`                | D1                                            |
| 14  | `packages/workers/vista-collector`  | `grove-vista-collector`   | Cron            | `*/5 * * * *`, `0 0 * * *` | D1                                            |
| 15  | `packages/workers/webhook-cleanup`  | `grove-webhook-cleanup`   | Cron            | `0 3 * * *`                | D1, R2                                        |

---

## What Pages Can't Do (That Workers Can)

These are the concrete capability gaps observed during the drive. Every one of these came from reading the actual wrangler.toml files and their comments.

### 1. Cron Triggers

The engine's `wrangler.toml` says it plainly on line 233:

> "Cron triggers are NOT supported in Pages mode"

This is why Grove has **8 separate cron workers** — tasks that would naturally live inside the main app have been split into standalone workers:

| Cron Worker         | What It Does                         | Natural Home      |
| ------------------- | ------------------------------------ | ----------------- |
| `webhook-cleanup`   | Deletes expired webhook events daily | Engine            |
| `post-migrator`     | Migrates posts between storage tiers | Engine            |
| `onboarding-emails` | Sends follow-up emails to signups    | Landing           |
| `clearing-monitor`  | Pings health endpoints every 5min    | Clearing          |
| `meadow-poller`     | Fetches RSS feeds every 15min        | Meadow            |
| `timeline-sync`     | Generates nightly AI summaries       | Engine            |
| `vista-collector`   | Collects observability metrics       | Landing           |
| `email-catchup`     | Weekly missed email recovery         | Landing or Engine |

If Pages apps became Workers, **up to 6 of these cron workers could be absorbed** into their parent apps, reducing the total deployment count from 23 to ~17.

### 2. Smart Placement

Workers support `[placement] mode = "smart"` which runs the worker closer to its D1 database. Heartwood already uses this (`packages/heartwood/wrangler.toml:71`). Every Pages app with D1 bindings is leaving latency on the table — especially Engine, which is the most DB-heavy app in the system.

### 3. Secrets Store Bindings

The engine's wrangler.toml notes on line 176:

> "GROVE_KEK is set as a regular Cloudflare secret because Pages doesn't support secrets_store_secrets bindings (only Workers do)."

Workers can use the centralized Cloudflare Secrets Store, which is better for rotating secrets across multiple services. Currently the KEK is set as a regular Cloudflare environment secret (`wrangler secret put GROVE_KEK`) on each service that needs it — this means rotating the key requires updating it individually on every service via the Cloudflare Dashboard or CLI, with no centralized rotation or audit trail. Converting to Workers would allow binding to a single Secrets Store entry, so rotating the KEK becomes a one-place change that propagates to all consumers.

### 4. Deployment Flags

Landing's wrangler.toml notes:

> "wrangler pages deploy doesn't support --var flags"

This means environment variables for Pages must be configured via the Cloudflare Dashboard (manual, error-prone) rather than via CLI (scriptable, version-controlled). Workers use `wrangler deploy` which supports `--var` flags natively.

### 5. Route Configuration in Code

Workers can define routes directly in `wrangler.toml` (see heartwood line 44-47, grove-router line 14-16). Pages apps must configure custom domains entirely through the Cloudflare Dashboard — no infrastructure-as-code.

### 6. Tail Workers

Workers support `tail_consumers` for real-time log streaming to another worker. This would allow Vista to receive structured logs from all deployments without polling — a major observability upgrade.

---

## Vista Observability Gap

This is the key finding of the safari. Vista currently monitors the Grove ecosystem from `packages/landing/src/routes/arbor/vista/` with data collected by `grove-vista-collector`.

### How Vista Collects Worker Data

The `collectWorkerMetrics()` function in `cloudflare-analytics.ts` queries:

```graphql
workersAnalyticsEngineAdaptiveGroups(
  filter: { datetimeHour_geq: "...", datetimeHour_leq: "..." }
)
```

This is the **Workers-specific analytics dataset**. It returns per-`scriptName` metrics:

- Request count (total, success, error)
- Error rate
- Latency percentiles (p50, p95, p99)
- CPU time

### The Gap: Pages Projects in the Analytics API

Pages Functions do run on Workers behind the scenes, and they _do_ appear in the Cloudflare Analytics API. But there are differences:

1. **Script name mismatch**: Pages projects may appear with their internal Pages project name rather than the `name` field in wrangler.toml. The `SERVICE_REGISTRY` lists `grove-engine` as the script name, but the actual Pages project is `grove-lattice`. This mismatch means Vista might collect data under the wrong name — or miss it entirely.

2. **No `scriptName` grouping guarantee**: The `workersAnalyticsEngineAdaptiveGroups` dataset may not consistently include Pages Functions the same way it includes Workers. If Pages requests are attributed to the Pages platform rather than individual scripts, the per-project breakdown could be lost.

3. **Health checks work fine**: The URL-based health checker pings `/api/health` regardless of deployment type, so that data is always available.

### What Conversion Would Fix

If all Pages became Workers:

- Every deployment would have a consistent `scriptName` in the Workers Analytics API
- Vista's `collectWorkerMetrics()` would capture all deployments uniformly
- The `SERVICE_REGISTRY` entries would map 1:1 to actual Cloudflare Worker script names
- Tail Workers could stream real-time logs from every deployment to a centralized handler

---

## Conversion Candidates — Priority Matrix

### Tier 1: Convert These (High Value)

#### 1. Engine (`grove-lattice`) — The Crown Jewel

**Character**: The beating heart of Grove. Every tenant site, every blog post, every admin panel — it all flows through here. The most complex deployment in the system, straining against Pages limitations.

**Why convert**:

- **Smart Placement** — This is the most D1-heavy app in the ecosystem (shared `grove-engine-db`, 2 KV namespaces, 3 R2 buckets, 6 DO bindings). Smart placement could reduce p50 latency meaningfully for all tenant page loads.
- **Absorb cron workers** — Could absorb `webhook-cleanup`, `post-migrator`, and `timeline-sync`. That's 3 fewer deployments to maintain.
- **Secrets Store** — The GROVE_KEK workaround (regular secret instead of secrets store) goes away.
- **Vista observability** — Consistent Worker analytics instead of ambiguous Pages analytics.
- **Tail Workers** — Real-time structured logging from the most critical service.
- **Route configuration** — Currently relies on `grove-router` for subdomain routing. As a Worker, it could define its own routes directly.

**Conversion complexity**: **Medium-High**. Largest codebase, most bindings, needs careful testing of the SvelteKit adapter swap. The CSRF config (`checkOrigin: false` with custom hooks) must be verified post-conversion.

**Workers it could absorb**:

- `grove-webhook-cleanup` (daily cron → engine cron)
- `grove-post-migrator` (daily cron → engine cron, currently disabled)
- `grove-timeline-sync` (daily cron → engine cron)

#### 2. Landing (`grove-landing`) — The Vista Host

**Character**: The public face of Grove and the admin nerve center. Home to Arbor (admin panel) and Vista (observability dashboard). Ironic that the observability dashboard can't fully observe itself.

**Why convert**:

- **Self-observability** — Landing hosts Vista but isn't monitored as cleanly as Workers are. Converting makes the observer a first-class citizen in its own system.
- **Absorb cron workers** — Could absorb `onboarding-emails` (daily email sequences). That worker lives _inside_ the landing package already (`packages/landing/workers/onboarding-emails/`).
- **Smart Placement** — Landing reads from D1 for admin operations and signup data.
- **`--var` flags** — Currently notes that Pages deploy "doesn't support --var flags" and secrets must be set via dashboard. Workers fix this.

**Conversion complexity**: **Medium**. Simpler bindings than engine. The onboarding-emails worker absorption is especially clean since it's already co-located.

**Workers it could absorb**:

- `grove-onboarding-emails` (daily cron → landing cron)

### Tier 2: Convert These (Medium Value)

#### 3. Plant (`grove-plant`) — The Payment Hub

**Character**: Where Wanderers become Rooted. Stripe integration, subscription management, signup flows. Every millisecond of latency here affects conversion rates.

**Why convert**:

- **Smart Placement** — Stripe webhook processing is DB-heavy (write subscription records, update tenant tiers). Lower D1 latency directly impacts payment reliability.
- **Cron potential** — Could run subscription health checks, expiry reminders.
- **Secrets management** — Multiple Stripe secrets (5+) that could use Secrets Store.

**Conversion complexity**: **Low-Medium**. Moderate bindings. Stripe webhook verification must be tested.

#### 4. Meadow (`grove-meadow`) — The Community Feed

**Character**: Where the community gathers. Notes, votes, reactions, a living feed of creativity.

**Why convert**:

- **Absorb meadow-poller** — The `grove-meadow-poller` cron (every 15 min) is Meadow's companion. As a Worker with cron triggers, Meadow could handle its own feed polling.
- **Smart Placement** — Feed queries are D1-heavy (joins across posts, users, votes).
- **DO consistency** — Already binds to ThresholdDO; as a Worker, the binding semantics are cleaner.

**Conversion complexity**: **Low-Medium**. Moderate bindings. Poller absorption is straightforward.

**Workers it could absorb**:

- `grove-meadow-poller` (15-min cron → meadow cron)

#### 5. Clearing (`grove-clearing`) — The Status Page

**Character**: The lighthouse. When things go wrong, Clearing shows the way. When things go right, it proves it.

**Why convert**:

- **Absorb clearing-monitor** — The `grove-clearing-monitor` cron (every 5 min) is literally Clearing's dedicated health checker. They share the same D1 database. Natural fit.
- **Smart Placement** — Reads from 2 D1 databases.

**Conversion complexity**: **Low**. Simple bindings. Monitor absorption is the main win.

**Workers it could absorb**:

- `grove-clearing-monitor` (5-min cron → clearing cron)

### Tier 3: Evaluate Later (Low Value)

#### 6. Domains (`grove-domains`)

Moderate complexity, has D1 and auth service binding. Benefits from Smart Placement but no cron workers to absorb. Convert when the others are done.

#### 7. Login (`grove-login`)

Minimal deployment — just an auth proxy with a single service binding to Heartwood. The conversion gain is marginal. It already has tight CSP headers and is deliberately thin. Convert last, if at all.

#### 8. Terrarium (`grove-terrarium`)

No backend at all. Uses localStorage exclusively. Zero bindings. No D1, no KV, no R2, no services. Converting this gains nothing except deployment consistency. Could stay as Pages indefinitely.

---

## The Technical Conversion Path

### What Changes Per Project

1. **`wrangler.toml`**: Replace `pages_build_output_dir` with `main` entry point + `[assets]` static asset config
2. **`svelte.config.js`**: Evaluate whether `@sveltejs/adapter-cloudflare` supports Worker output, or switch to `@sveltejs/adapter-cloudflare-workers` (the newer Cloudflare Workers + Static Assets support may unify these)
3. **GitHub Actions**: Change `wrangler pages deploy .svelte-kit/cloudflare --project-name=xxx` to `wrangler deploy`
4. **Add capabilities**: `[placement] mode = "smart"`, `[triggers] crons = [...]`, route configs
5. **Absorb crons**: Move cron handler logic into the main app's `scheduled()` export

### What Doesn't Change

- SvelteKit application code — routes, components, server files all stay the same
- D1/KV/R2/Service bindings — identical syntax in wrangler.toml
- The `platform.env` access pattern in SvelteKit server code — works the same way
- Static assets — Cloudflare Workers Static Assets serves them the same as Pages

### Risk Factors

- **Custom domain migration**: Pages custom domains and Workers custom domains are configured differently. Each domain needs to be re-pointed.
- **Build output path**: The `.svelte-kit/cloudflare` output directory structure may differ slightly between adapters. Needs verification per project.
- **Deployment history**: Pages and Workers have separate deployment histories in the Cloudflare Dashboard. Old rollback targets are lost.
- **Preview deployments**: Pages has built-in branch previews. Workers doesn't natively (though Workers Versions/Gradual Rollouts provide a similar capability).
- **Environment separation**: Pages has production/preview environments by branch. Workers uses `[env.staging]` config blocks. Migration needs to preserve any existing staging setups.

---

## Cron Worker Consolidation Map

If Tier 1 + 2 conversions happen, this is how cron workers collapse:

| Current Worker            | Absorbed Into | Cron Schedule              | Status   |
| ------------------------- | ------------- | -------------------------- | -------- |
| `grove-webhook-cleanup`   | Engine        | `0 3 * * *`                | Active   |
| `grove-post-migrator`     | Engine        | `0 3 * * *`                | Disabled |
| `grove-timeline-sync`     | Engine        | `0 1 * * *`                | Active   |
| `grove-onboarding-emails` | Landing       | `0 10 * * *`               | Active   |
| `grove-meadow-poller`     | Meadow        | `*/15 * * * *`             | Active   |
| `grove-clearing-monitor`  | Clearing      | `*/5 * * * *`, `0 0 * * *` | Active   |

**Result**: 6 fewer standalone deployments. Total goes from 23 → 17.

Workers that remain standalone (they serve different domains or have unique concerns):

- `grove-vista-collector` — Collects from _all_ services, shouldn't be embedded in one
- `grove-email-catchup` — Weekly cron, could go in Engine or Zephyr
- `grove-pulse` — Webhook receiver for GitHub, standalone is fine
- `grove-email-render` — Stateless renderer, called by multiple services

---

## Vista Observability Upgrade Path

### Phase 1: Registry Alignment (Do Now)

Update `SERVICE_REGISTRY` in `types.ts` to accurately reflect current script names:

- Verify `grove-engine` vs `grove-lattice` script name in Cloudflare Analytics
- Add missing Pages projects that aren't currently tracked (Landing, Plant, Clearing, Domains, Login)
- Add workers that exist but aren't in the registry (Zephyr, Pulse, OG Worker, Email Render, Email Catchup, Timeline Sync, Webhook Cleanup)

### Phase 2: Unified Analytics (After Conversion)

Once Pages are converted to Workers:

- All deployments appear consistently in `workersAnalyticsEngineAdaptiveGroups`
- Vista's Workers dashboard covers everything — no blind spots
- Health checks remain the same (URL-based pings)

### Phase 3: Tail Worker Logging (Future)

Add a `grove-vista-tail` worker as a `tail_consumer` on all Worker deployments:

- Receives real-time `console.log`, `console.error`, and exception events
- Writes structured logs to D1 or streams to external logging
- Vista gets a real-time log viewer for every service

---

## Bonus Stop: The Engine Identity Crisis

_The jeep rounds a kopje and there it is — the largest creature on the savanna. But something's wrong with the silhouette. It's carrying something. Two animals, one body. A library riding a deployment. Binoculars up._

### What we're looking at

`packages/engine` is simultaneously:

1. **A shared library** published as `@autumnsgrove/lattice` with **253 export paths**, consumed by **10 packages** across 162 files
2. **A live deployment** (`grove-lattice`) serving every tenant site, with **262 route files**, **127 API handlers**, and **121 endpoints**

These are two fundamentally different things sharing one `package.json`, one directory, one build pipeline.

### The library (what other packages consume)

```
src/lib/ — 539 files across 28 directories
├── ui/          — 100+ glassmorphism components, stores, editor
├── config/      — Colors, fonts, tiers, auth config
├── errors/      — Signpost error system
├── heartwood/   — Auth client, rate limiting, quotas
├── threshold/   — Rate limiting adapters (SvelteKit, Hono, Worker)
├── loom/        — Durable Objects SDK
├── lumen/       — AI routing engine
├── email/       — Email rendering (react-email + Resend)
├── grafts/      — Pre-built feature bundles (login, pricing, greenhouse)
├── server/      — Services, observability, database helpers
├── vineyard/    — Component catalog system
├── zephyr/      — Email gateway client
└── ...22 more categories
```

**Top consumers**: Landing (65 files), Engine itself (51 files), Plant (20), Meadow (12), Durable Objects (9)

**Most imported paths**: `config` (47 imports), `server/observability` (33), `services` (24), `utils` (11), `threshold` (8+8), `errors` (7)

Built via `svelte-package -o dist` → published to npm.

### The app (what tenants interact with)

```
src/routes/ — 262 files across 215 directories
├── api/           — 127 API handlers (80+ for curios alone)
│   ├── curios/    — Guestbook, gallery, badges, timeline, bookmarks...
│   ├── admin/     — Settings, migrations, meadow
│   ├── auth/      — Session management
│   ├── billing/   — Stripe integration
│   └── blooms/    — Post CRUD, reactions, view tracking
├── (site)/        — Public pages (gallery, guestbook, pulse, timeline)
├── (tenant)/      — Per-tenant routes
├── [slug]/        — Dynamic blog post routes
├── arbor/         — Admin panel (with Vista)
├── auth/          — Auth flows
└── ...more feature areas
```

Built via `vite build` → `.svelte-kit/cloudflare/` → deployed as Pages.

### Internal-only lib modules (not exported)

Some `src/lib/` modules exist solely to serve routes — never exported:

| Module             | Files | Lines  | Purpose                            |
| ------------------ | ----- | ------ | ---------------------------------- |
| `sentinel/`        | 7     | ~3,964 | Content safety/moderation pipeline |
| `durable-objects/` | 4     | —      | Local DO helpers for routes        |
| `scribe/`          | 2     | —      | Writing/content helpers            |
| `types/`           | 3     | —      | Shared route TypeScript types      |
| `git/`             | 2     | —      | Git-related utilities              |

Sentinel alone is ~4k lines of sophisticated safety infrastructure that only 2 routes touch. It lives in the library directory but has nothing to do with being a library.

### The mismatch

The name "engine" implies a library — a thing that powers other things. And it IS that: `@autumnsgrove/lattice` is imported everywhere. But it's also the live application that _is the product_. Two identities:

| Concern       | Library                                   | App                                                 |
| ------------- | ----------------------------------------- | --------------------------------------------------- |
| **Name**      | `@autumnsgrove/lattice`                   | `grove-lattice`                                     |
| **Purpose**   | Provide shared infrastructure             | Serve tenant sites                                  |
| **Build**     | `svelte-package` → `dist/`                | `vite build` → `.svelte-kit/cloudflare/`            |
| **Deploy**    | Published to npm (consumed at build time) | Deployed to Cloudflare Pages (runs at request time) |
| **Consumers** | 10 packages                               | Every Wanderer with a `*.grove.place` blog          |
| **Changes**   | Must be backwards-compatible              | Can ship breaking route changes freely              |
| **Testing**   | Unit tests for exports                    | Integration tests for routes + API                  |

### Why this matters for the conversion

If we split the engine into **library** + **app**, the Pages-to-Workers conversion becomes cleaner:

- The **library** doesn't deploy at all — it's just an npm package. No wrangler.toml needed. No Cloudflare Pages vs Workers question.
- The **app** gets its own identity, its own wrangler.toml, and converts to a Worker cleanly. It can absorb cron workers, use smart placement, and be a first-class Vista citizen.
- Internal-only modules (Sentinel, DO helpers, types) move to the app, not the library.
- The library's `package.json` exports get simpler — no need for the dual `build` + `package` scripts.

### The terminology, not a rename

Both halves are Lattice. Things grow on a lattice — one lattice is static (the library you import), one is live (the deployment serving `*.grove.place`). We don't need a new Grove name. We need clear words:

|             | **Lattice** (the library)  | **The engine** (the deployment)          |
| ----------- | -------------------------- | ---------------------------------------- |
| Package     | `@autumnsgrove/lattice`    | `grove-lattice`                          |
| Lives at    | `libs/engine/src/lib/`     | `libs/engine/src/routes/`                |
| Build       | `svelte-package` → `dist/` | `vite build` → `.svelte-kit/cloudflare/` |
| Consumed by | 10+ packages at build time | Every Wanderer at request time           |
| Future home | `libs/engine/`             | `apps/engine/`                           |

In conversation:

- "**Lattice** exports the component" = the library
- "**The engine** serves the route" = the deployment
- "**Lattice** provides it, **the engine** renders it"

The split happens in directory structure, not in branding. When the time comes:

```
libs/
├── engine/           ← The library (static lattice, @autumnsgrove/lattice)
│   ├── src/lib/      ← All exported modules (539 files)
│   ├── package.json  ← @autumnsgrove/lattice, exports only
│   └── (no routes, no wrangler.toml, no svelte.config.js)

apps/
├── engine/           ← The deployment (live lattice, grove-lattice)
│   ├── src/
│   │   ├── routes/   ← All 262 route files
│   │   └── lib/      ← Internal-only modules (sentinel, DO helpers, types)
│   ├── wrangler.toml ← Worker config (not Pages!)
│   ├── svelte.config.js
│   └── package.json  ← imports from @autumnsgrove/lattice
```

No new name needed. Both are lattice. One you build with, one you visit.

This split is the prerequisite step before converting to a Worker. The library doesn't deploy — no conversion needed. The engine converts and gains smart placement, cron triggers, secrets store, and full Vista observability.

---

## Expedition Summary

### By the numbers

| Metric                  | Count                 |
| ----------------------- | --------------------- |
| Total deployments       | 23                    |
| Cloudflare Pages        | 8                     |
| Cloudflare Workers      | 15                    |
| Workers — HTTP services | 7                     |
| Workers — Cron only     | 8                     |
| Cron workers absorbable | 6                     |
| Post-conversion total   | ~17                   |
| Vista-monitored today   | 11 (SERVICE_REGISTRY) |
| Vista-unmonitored today | 12                    |

### Recommended trek order

1. **Engine split (library + app), then app to Worker** — Highest value, most bindings, best observability + latency gains. Split `libs/engine` into `libs/engine` (library only) + `apps/engine` (deployment), then convert the app. Both directories keep the `engine` name to avoid another round of mass renames — the package name `@autumnsgrove/lattice` and the deploy name `grove-lattice` stay as-is.
2. **Landing** — Second-highest value, hosts Vista, absorbs onboarding-emails. Validates the pattern scales.
3. **Meadow** — Absorbs meadow-poller, gains smart placement.
4. **Clearing** — Absorbs clearing-monitor, simple conversion.
5. **Plant** — Smart placement for payment latency, secrets store for Stripe keys.
6. **Domains** → **Login** → **Terrarium** — Low priority, convert for consistency.

### Cross-cutting themes

1. **Pages limitations are already documented in the codebase** — The engine and landing wrangler.toml files have comments explicitly noting Pages can't do cron, can't use secrets store, can't use `--var` flags. The team has already felt these limits.

2. **Cron worker sprawl** — 8 standalone cron workers exist because Pages can't have cron triggers. This is the single biggest operational win of conversion: fewer deployments, fewer GitHub Actions workflows, fewer things to maintain.

3. **Vista has blind spots** — The SERVICE_REGISTRY tracks 11 workers but there are 23 deployments. That's 12 unmonitored services. Even before conversion, the registry should be expanded.

4. **Smart Placement is free latency** — Heartwood already uses it. Every DB-heavy Pages app is paying a latency tax that a one-line config change (`[placement] mode = "smart"`) would fix after conversion.

5. **The adapter story is converging** — Cloudflare has been merging Pages and Workers. Workers Static Assets (GA since 2024) lets Workers serve static files. SvelteKit's `@sveltejs/adapter-cloudflare` may already support Worker output mode, or the transition to `adapter-cloudflare-workers` is well-documented.

6. **The engine is two things pretending to be one** — A 539-file library (`@autumnsgrove/lattice`) and a 262-route deployment (`grove-lattice`) share one directory. Both are lattice — one static, one live. The split is structural (`libs/lattice` + `apps/engine`), not a rename. Same lattice, two contexts.

---

_The fire dies to embers. The journal is full — 23 stops, 8 Pages observed, 15 Workers catalogued, 6 cron absorptions sketched, 1 identity crisis documented, the whole Cloudflare landscape mapped. The Vista watchtower stands clearer now, and the path to unified observability is drawn in the dirt. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._
