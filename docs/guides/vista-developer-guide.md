---
title: "Vista Developer Guide"
description: "How to work with the Vista observability dashboard inside Arbor, from adding new monitoring targets to understanding the collection pipeline."
category: guides
guideCategory: operations
lastUpdated: "2026-03-12"
aliases: []
tags:
  - vista
  - monitoring
  - observability
  - arbor
---

# Vista Developer Guide

How to work with Vista, the infrastructure monitoring dashboard inside Arbor. Vista is the lookout point: it shows every worker's health, every database's size, every dollar being spent. It lives at `/arbor/vista/` as a set of admin routes inside the landing app.

## How It Works

Vista has three layers: **collection**, **storage**, and **display**. Data flows in one direction, and each layer fails independently.

### Collection

A cron worker called `grove-vista-collector` runs every 5 minutes. It calls `createObservabilityCollector(env).runFullCollection()` from `@autumnsgrove/lattice/server/observability`, which orchestrates six steps:

1. **Cloudflare API collectors** run in parallel via `Promise.allSettled`. Four collectors query the Cloudflare GraphQL Analytics API, D1 HTTP API, R2 API, and KV API for metrics on all registered services. Each collector requires `CF_OBSERVABILITY_TOKEN` and `CF_ACCOUNT_ID`.

2. **Health checks** ping every HTTP-accessible worker's `/health` endpoint. Latency determines the status classification: under 500ms is operational, 500-1500ms is degraded, 1500-3000ms is partial outage, anything beyond that (or a failed request) is major outage. Each check has a 5-second timeout.

3. **Durable Object metrics** are collected via `collectDOMetrics`, querying DO-specific analytics separately from the main Cloudflare API collectors.

4. **Internal aggregators** query existing application tables in the main `DB` database. Eight aggregators run in parallel: Lumen (AI costs/tokens), Petal (image moderation), Thorn (text moderation), Sentinel (load tests), Clearing (status page components), Warden (API gateway auth), Meadow (community feed), and Firefly (ephemeral servers). These aggregators read from tables like `lumen_usage` and produce summary objects.

5. **Alert threshold evaluation** compares the latest metric values against configured thresholds. Two batch queries replace what would be an N+1 loop: one fetches all latest metric values, one fetches all active alert keys. The per-threshold evaluation runs in memory, only writing to D1 when a state change occurs.

6. **Retention cleanup** runs at midnight UTC, deleting rows older than 90 days from all time-series tables.

### Storage

Vista uses a dedicated D1 database bound as `OBS_DB`, separate from the main application database. Ten tables store time-series data:

| Table | What it holds |
|-------|--------------|
| `observability_metrics` | General per-worker metric rows (requests, errors, latency) |
| `observability_health_checks` | HTTP health check results per endpoint |
| `observability_d1_stats` | Database size, rows read/written, query count |
| `observability_r2_stats` | Bucket object count, total size, Class A/B operations |
| `observability_kv_stats` | Namespace read/write/delete counts and health status |
| `observability_do_stats` | Durable Object class counts, storage, instrumentation status |
| `observability_daily_costs` | Aggregated daily cost estimates per service |
| `observability_alert_thresholds` | Configured alert rules (unique on service + metric) |
| `observability_alerts` | Triggered alerts with resolution tracking |
| `observability_collection_log` | Metadata about each collection run (timing, errors) |

All timestamps are Unix epoch seconds (integers), following the convention used across the observability module.

The Drizzle schema lives at `libs/engine/src/lib/server/db/schema/observability.ts`.

### Display

The dashboard routes live at `apps/landing/src/routes/arbor/vista/`. A layout server load function gates all Vista pages behind the `isWayfinder()` check, which means only the platform operator can access them. The parent `/arbor/+layout.server.ts` already handles general auth.

Each page's `+page.server.ts` follows the same pattern:

1. Call `await parent()` to ensure the Wayfinder gate ran
2. Get the `OBS_DB` (or `DB` for aggregator pages) from `platform?.env`
3. If the database binding is missing, return empty data with `dbAvailable: false`
4. Query using the exported functions from `@autumnsgrove/lattice/server/observability`
5. Wrap queries in `Promise.allSettled` so one failure never blocks the page

The layout renders its own `ArborPanel` with Vista-specific sidebar navigation, bypassing the standard Arbor panel.

## Dashboard Pages

Vista has 12 pages organized into two groups.

### Infrastructure pages

**Overview** (`/arbor/vista/`) shows collection status banners, active alert count, last collection time, service health summary, and a manual collection trigger button. The banner logic handles four states: token missing, never attempted, attempted but never completed, and healthy.

**Workers** (`/arbor/vista/workers/`) loads 24-hour worker metrics and groups them by service name. The table shows request count, error rate (color-coded: red above 5%, yellow above 1%), and p50/p95 latency.

**Databases** (`/arbor/vista/databases/`) displays D1 database cards with size, rows read, and rows written. Each card shows the database ID and last-recorded timestamp.

**Storage** (`/arbor/vista/storage/`) has two sections: R2 buckets (object count, total size, Class A/B operations) and KV namespaces (health status badge, read/write/delete counts).

**Durable Objects** (`/arbor/vista/durable-objects/`) merges collected DO stats with the `SERVICE_REGISTRY` to show every known DO class, even ones that haven't reported yet. Each row shows active/hibernating instance counts, alarm count, storage bytes, and instrumentation status.

**Costs** (`/arbor/vista/costs/`) shows 30 days of daily cost estimates, grouped by date and broken down by service. The grand total appears at the top. A footer note shows the `PRICING_LAST_VERIFIED` date and a reminder that these are estimates.

**Alerts** (`/arbor/vista/alerts/`) shows active alerts, recent alert history, the current threshold configuration table, and a form to add or update thresholds. The form POSTs to `/api/admin/observability/thresholds`.

### Service-specific pages

**AI Usage** (`/arbor/vista/ai/`) calls `aggregateLumen(db)` against the main `DB` (not `OBS_DB`) and displays 24h cost, 30d cost, request count, token breakdown (input/output), average latency, and tables for provider and model breakdowns.

**Moderation** (`/arbor/vista/moderation/`) calls `aggregatePetal(db)` and `aggregateThorn(db)` for image and text moderation stats.

**Warden** (`/arbor/vista/warden/`) calls `aggregateWarden(db)` for API gateway metrics: request volume, auth failure rate, per-service latency, nonce reuse attempts, and rate limit hits.

**Meadow** (`/arbor/vista/meadow/`) calls `aggregateMeadow(db)` for community feed metrics: post creation rate, engagement, report queue depth, and rate limit hits.

**Firefly** (`/arbor/vista/firefly/`) calls `aggregateFirefly(db)`. Since Queen Firefly is not yet deployed, this currently shows a placeholder notice.

### Database binding difference

Infrastructure pages use `platform?.env?.OBS_DB` (the dedicated observability database). Service-specific pages use `platform?.env?.DB` (the main engine database), because their aggregators query application tables like `lumen_usage` and `thorn_moderation_log` directly.

## Adding a New Monitoring Target

### Adding a worker to health checks

Open `libs/engine/src/lib/server/observability/types.ts` and add an entry to `SERVICE_REGISTRY.workers`:

```typescript
{
  name: "grove-new-worker",
  scriptName: "grove-new-worker",
  healthCheckUrl: "https://new.grove.place/health",
  healthPath: "/health",
  hasHttp: true,
  description: "What this worker does",
},
```

Set `hasHttp: false` and `healthCheckUrl: null` for cron-only workers. The health checker skips workers where `hasHttp` is false.

The new worker will be picked up automatically on the next collection run. No dashboard changes needed.

### Adding a database, bucket, or KV namespace

Add entries to `SERVICE_REGISTRY.databases`, `SERVICE_REGISTRY.buckets`, or `SERVICE_REGISTRY.kvNamespaces` in the same `types.ts` file. The D1, R2, and KV collectors iterate over these registries to know what to query.

### Adding a Durable Object class

Add an entry to `SERVICE_REGISTRY.durableObjects`:

```typescript
{
  className: "NewDO",
  workerScriptName: "grove-durable-objects",
  description: "What this DO does",
  instrumented: false,
},
```

Set `instrumented: true` once the DO class implements the `reportMetrics()` protocol. The durable objects page merges registry entries with collected stats, so even uninstrumented DOs appear in the table.

### Adding a new aggregator

Create a file in `libs/engine/src/lib/server/observability/aggregators/`. Follow the pattern from `lumen-aggregator.ts`:

1. Define a result type (e.g., `MyAggregateResult`) and export it from `types.ts`
2. Export an `async function aggregateMyService(db: D1Database)` that returns `CollectorResult & { data?: MyAggregateResult }`
3. Use `Promise.allSettled` for parallel queries inside the aggregator
4. Catch and return errors gracefully (never throw from an aggregator)
5. Add the import and call to `scheduler.ts` in the Step 4 `Promise.allSettled` block
6. Re-export from `index.ts`

### Adding a new dashboard page

1. Create the route directory under `apps/landing/src/routes/arbor/vista/your-page/`
2. Write `+page.server.ts` following the existing pattern (call `parent()`, check for db, query with error handling)
3. Write `+page.svelte` using `GlassCard` from `@autumnsgrove/lattice/ui`
4. Add a nav entry to `vistaNav` in `apps/landing/src/routes/arbor/vista/+layout.svelte` with an appropriate Lucide icon

## API Endpoints

Two API routes support Vista's interactive features:

**`POST /api/admin/observability/collect`** triggers a manual collection run via a service binding to the `VISTA_COLLECTOR` worker. Requires Wayfinder access and `CF_OBSERVABILITY_TOKEN`. Returns the full `CollectionResult` on success.

**`GET /api/admin/observability/thresholds`** lists all alert thresholds.

**`POST /api/admin/observability/thresholds`** upserts an alert threshold. Required fields: `serviceName`, `metricType`, `operator` (one of `gt`, `lt`, `gte`, `lte`, `eq`), `thresholdValue` (finite number), `severity` (one of `info`, `warning`, `critical`). The upsert uses `ON CONFLICT(service_name, metric_type)` so posting for an existing pair updates it.

All endpoints validate `isWayfinder()` and return structured error codes with the `GROVE-OBS-` prefix.

## Cost Calculation

The cost calculator in `libs/engine/src/lib/server/observability/costs.ts` uses hardcoded Cloudflare pricing constants (last verified `2026-02-18`). It accounts for free tier allotments on the Workers Paid plan, dividing monthly free tiers by 30 for daily estimates.

Key pricing functions:

- `calculateDailyCosts(usage)` takes raw usage numbers and returns a full `CostBreakdown` covering Workers, D1, R2, KV, Durable Objects, and Workers AI
- `projectMonthly(dailyCost)` multiplies daily costs by 30 (intentionally a slight underestimate)
- `calculateFireflySessionCost(provider, instanceType, durationSeconds)` calculates ephemeral server costs for Queen Firefly across four providers (Hetzner, Fly.io, Railway, DigitalOcean)

When Cloudflare updates pricing, update the constants in `costs.ts` and bump `PRICING_LAST_VERIFIED`. Historical cost rows in D1 are not retroactively recalculated.

## Why It Breaks

**"Awaiting first collection run" banner won't go away.** The `grove-vista-collector` worker either isn't deployed, its cron trigger isn't configured, or `CF_OBSERVABILITY_TOKEN` is missing. Check the token banner first, since that one takes priority in the UI.

**Service-specific pages show no data but infrastructure pages work.** Service pages query `DB` (the main engine database), not `OBS_DB`. If `DB` isn't bound in the landing app's `wrangler.toml`, these pages return null. Check that both bindings exist.

**Worker appears in health checks but shows zero requests.** The Cloudflare Analytics GraphQL API returns data with a delay (typically a few minutes). Zero-traffic workers also get explicit zero rows written by the collector so you can distinguish "no traffic" from "no data."

**Alerts fire but don't resolve.** Alert resolution happens during the next collection run when the metric drops below the threshold. If the collector stops running, alerts stay open. Resolved alerts get `resolved_at` set to the epoch second of the collection that cleared them.

**Cost estimates seem wrong.** The calculator divides monthly free tiers by 30 for daily estimates. This means daily "costs" can be $0.00 for low-traffic services even when there's real usage, because the daily share of the free tier covers it. The numbers are estimates based on API-reported usage, not Cloudflare billing data.

**New worker/database/bucket doesn't appear.** You added it to `SERVICE_REGISTRY` in `types.ts` but the engine library hasn't been rebuilt. Run `svelte-package` in `libs/engine/` so the `dist/` output includes the updated registry.

**Manual collection button returns 501.** The `VISTA_COLLECTOR` service binding isn't configured in the landing app's `wrangler.toml`. The collector worker needs to be bound as a service binding for the landing app to call it.

## Architecture Notes

Vista was originally designed as a standalone app (`vista.grove.place`) with its own collector worker, API worker, and SvelteKit dashboard. The current implementation folds the dashboard into the landing app under `/arbor/vista/`, while the collector remains a separate cron worker. The API worker was replaced by SvelteKit server load functions and two API route handlers.

The observability library in `libs/engine/src/lib/server/observability/` is the core of the system. It exports everything: types, the service registry, collectors, aggregators, cost calculations, and query functions. All Vista route files import from `@autumnsgrove/lattice/server/observability`.

The collection pipeline uses `Promise.allSettled` at every level. One failing collector never blocks others. One failing aggregator never blocks others. One failing health check never blocks others. This is a deliberate design choice: partial data is always better than no data in a monitoring system.

The `CollectionStatus` interface provides multi-state diagnostics for the overview page. It distinguishes between: token missing, never attempted, attempted but never completed, and healthy. This replaces the older boolean `hasCollectionData()` function, which only knew "data exists" or "no data."

## Key Files

**Routes (dashboard UI)**
- `apps/landing/src/routes/arbor/vista/+layout.server.ts` - Wayfinder gate
- `apps/landing/src/routes/arbor/vista/+layout.svelte` - Sidebar nav, ArborPanel
- `apps/landing/src/routes/arbor/vista/+page.server.ts` - Overview data loading
- `apps/landing/src/routes/arbor/vista/+page.svelte` - Overview page with status banners
- `apps/landing/src/routes/arbor/vista/{workers,databases,storage,durable-objects,costs,alerts,ai,moderation,warden,meadow,firefly}/` - Individual dashboard pages

**API routes**
- `apps/landing/src/routes/api/admin/observability/collect/+server.ts` - Manual trigger
- `apps/landing/src/routes/api/admin/observability/thresholds/+server.ts` - Threshold CRUD

**Observability library**
- `libs/engine/src/lib/server/observability/index.ts` - Barrel export with query functions
- `libs/engine/src/lib/server/observability/types.ts` - All types and `SERVICE_REGISTRY`
- `libs/engine/src/lib/server/observability/scheduler.ts` - Collection orchestrator
- `libs/engine/src/lib/server/observability/costs.ts` - Pricing constants and calculators

**Collectors**
- `libs/engine/src/lib/server/observability/collectors/cloudflare-analytics.ts` - Worker metrics
- `libs/engine/src/lib/server/observability/collectors/d1-collector.ts` - D1 stats
- `libs/engine/src/lib/server/observability/collectors/r2-collector.ts` - R2 stats
- `libs/engine/src/lib/server/observability/collectors/kv-collector.ts` - KV stats
- `libs/engine/src/lib/server/observability/collectors/health-checker.ts` - HTTP health checks
- `libs/engine/src/lib/server/observability/collectors/do-collector.ts` - Durable Object stats

**Aggregators**
- `libs/engine/src/lib/server/observability/aggregators/lumen-aggregator.ts` - AI gateway
- `libs/engine/src/lib/server/observability/aggregators/petal-aggregator.ts` - Image moderation
- `libs/engine/src/lib/server/observability/aggregators/thorn-aggregator.ts` - Text moderation
- `libs/engine/src/lib/server/observability/aggregators/sentinel-aggregator.ts` - Load testing
- `libs/engine/src/lib/server/observability/aggregators/clearing-aggregator.ts` - Status page
- `libs/engine/src/lib/server/observability/aggregators/warden-aggregator.ts` - API gateway
- `libs/engine/src/lib/server/observability/aggregators/meadow-aggregator.ts` - Community feed
- `libs/engine/src/lib/server/observability/aggregators/firefly-aggregator.ts` - Ephemeral servers

**Database schema**
- `libs/engine/src/lib/server/db/schema/observability.ts` - Drizzle schema (10 tables)

**Spec**
- `docs/specs/vista-spec.md` - Original design spec

## Checklist

When adding a new monitoring target:

- [ ] Added entry to `SERVICE_REGISTRY` in `types.ts`
- [ ] Rebuilt the engine library (`svelte-package` in `libs/engine/`)
- [ ] Verified the target appears after the next collection run
- [ ] If adding an aggregator: created the aggregator file, exported from `index.ts`, added to `scheduler.ts`

When adding a new dashboard page:

- [ ] Created `+page.server.ts` with parent gate, db check, and error-safe queries
- [ ] Created `+page.svelte` with empty-state handling and collection status banner
- [ ] Added nav entry to `vistaNav` in the layout
- [ ] Tested with `dbAvailable: false` (no OBS_DB binding) to confirm graceful fallback

When updating pricing:

- [ ] Updated constants in `costs.ts`
- [ ] Bumped `PRICING_LAST_VERIFIED` to the verification date
- [ ] Verified free tier allotments haven't changed
- [ ] Noted that historical rows keep their original pricing version
