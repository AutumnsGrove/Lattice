# Observability Plan: Comprehensive Platform Monitoring for Grove

## Current State

### What You Have (Observability That Exists Today)

| System       | What It Tracks                                                           | Where Data Lives                                                                  |
| ------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Lumen**    | AI gateway: per-request tokens, cost, latency, provider, model, quota    | `lumen_usage` table in grove-engine-db                                            |
| **Petal**    | Image moderation: layer results, confidence, SHA-256 hashes, NCMEC queue | `petal_security_log`, `petal_account_flags`, `petal_ncmec_queue`                  |
| **Thorn**    | Text moderation: actions, categories, flagged content queue              | `thorn_moderation_log`, `thorn_flagged_content`                                   |
| **Sentinel** | Load testing: throughput, latency percentiles, baselines, checkpoints    | `sentinel_runs`, `sentinel_metrics`, `sentinel_checkpoints`, `sentinel_baselines` |
| **Clearing** | Status page: component status, incidents, uptime history                 | `status_components`, `status_incidents`, `status_daily_history`                   |
| **Pulse**    | Dev activity: GitHub webhook events, streaks, daily stats                | `pulse_events`, `pulse_daily_stats`                                               |

### What You Don't Have (The Gaps)

| Gap                               | Impact                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------- |
| **Worker health/request metrics** | No visibility into request volume, error rates, or latency per worker         |
| **Durable Object status**         | No idea how many DOs are active vs hibernating, memory usage, alarm frequency |
| **D1 database usage**             | No visibility into reads/writes/storage across 9 databases                    |
| **R2 storage metrics**            | No idea how much you're storing, transferring, or paying for across 6 buckets |
| **KV operation counts**           | No visibility into read/write patterns across 7 namespaces                    |
| **Unified cost tracking**         | No single view of what the platform costs to run                              |
| **Alerting**                      | No automated notifications when things break or costs spike                   |
| **Cross-service dashboard**       | No single pane of glass -- data exists but is scattered                       |

### What Changed on Main (Deep Dive Findings)

Three significant services landed or were respecced since the original plan was drafted:

| Service           | What Changed                                                                                                                             | Observability Impact                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Warden**        | New API gateway — proxies all external API requests for agents with credential injection, nonce-based auth, rate limiting, audit logging | Needs full monitoring: request volume, auth failures, nonce reuse detection, per-service latency, upstream API health, cost attribution |
| **Meadow**        | Community feed in early beta — RSS poller, note creation, votes/reactions, auth redirect fixes                                           | Needs monitoring: polling health, feed freshness, auth failure rates, note creation errors, rate limit hit rates                        |
| **Queen Firefly** | Rewritten as provider-agnostic SDK ecosystem — ephemeral server management via Firefly SDK, cost tracking, orphan detection              | Needs monitoring: ignition/fade times, session costs, orphan instance detection, pool health, provider latency                          |

The v1.0 readiness audit also flagged **rate limiter KV failure (fail-open)** as a medium-severity issue — observability should detect when rate limiting silently stops working.

### GitHub Issues (16 Total, 14 Open)

**Vista Epic (#609, Phases #610-#616):** Full infrastructure monitoring dashboard at vista.grove.place
**Songbird Metrics (#598):** Per-request timing and cost for prompt injection protection
**Langfuse Integration (#1024):** AI observability via Langfuse for OpenRouter monitoring
**Queen Firefly CI (#914-#916):** CI cost tracking, web dashboard, Slack/Discord notifications

---

## Architecture Decision

**Everything stays in the monorepo.** The original Vista spec called for a separate repo (AutumnsGrove/GroveMonitor), but the monorepo structure makes development faster and keeps all the pieces close together. Observability lives alongside the services it monitors -- shared types, shared auth, shared DB, no cross-repo coordination overhead.

Vista's observability module will be built directly in GroveEngine:

- Metrics storage in grove-engine-db (same D1 database, new tables)
- Collector services in `packages/engine/src/lib/server/observability/`
- Dashboard pages in the Arbor admin panel at `/arbor/observability/`
- API endpoints at `/api/admin/observability/`
- DO instrumentation in `packages/durable-objects/`
- Reuses existing Heartwood auth (admin-only, no separate OAuth client needed)

This means no separate deployment, no separate D1/KV provisioning, no cross-service auth dance. Just build, deploy the engine, and observability ships with it.

---

## Operational Prerequisites

### Cloudflare API Token

The collectors need a Cloudflare API token to query the Analytics GraphQL API, D1 HTTP API, R2 API, and KV Analytics API. This is the single biggest setup dependency.

**Required token scopes:**

- `Account Analytics:Read` — Worker request/error/latency metrics via GraphQL
- `Account D1:Read` — Database size, row counts, query stats
- `Account Workers R2 Storage:Read` — Bucket object counts, storage sizes
- `Account Workers KV Storage:Read` — Namespace operation counts
- `Account Workers Scripts:Read` — Worker list and deployment status

**Storage:** The token goes in the engine's `wrangler.toml` as a secret (`CF_OBSERVABILITY_TOKEN`), deployed via `gw secret apply --write` or `wrangler secret put`. It lives alongside `CF_ACCOUNT_ID` which is already in environment config.

**Rotation:** Cloudflare API tokens don't expire by default, but the plan should support rotation. The token is read from the Worker environment on each collection cycle — rotating means deploying a new secret value. No code change needed, just `wrangler secret put CF_OBSERVABILITY_TOKEN`. A future improvement could add token expiry monitoring as an alert threshold itself.

**Separation of concerns:** This token is read-only and scoped to analytics. It cannot modify workers, databases, or storage. It's a separate token from any deployment credentials.

---

## Implementation Plan

### Step 1: Observability Types & Constants

**File:** `packages/engine/src/lib/server/observability/types.ts`

Define the unified type system covering all metrics:

```typescript
// Worker metrics (from Cloudflare Analytics GraphQL API)
interface WorkerMetrics {
  name: string;
  requests: { total: number; success: number; error: number };
  errorRate: number;
  latency: { p50: number; p95: number; p99: number };
  cpuTimeAvg: number;
  durationAvg: number;
}

// D1 metrics
interface D1Metrics {
  name: string;
  databaseId: string;
  sizeBytes: number;
  rowsRead: number;
  rowsWritten: number;
  queryCount: number;
}

// R2 metrics
interface R2Metrics {
  bucket: string;
  objectCount: number;
  totalSizeBytes: number;
  classAOps: number; // PUT/POST/LIST
  classBOps: number; // GET
}

// KV metrics
interface KVMetrics {
  namespace: string;
  namespaceId: string;
  reads: number;
  writes: number;
  deletes: number;
  lists: number;
}

// Durable Object metrics (self-reported)
interface DurableObjectMetrics {
  className: string;
  activeInstances: number;
  hibernatingInstances: number;
  totalAlarms: number;
  storageBytes: number;
}

// Cost breakdown
interface CostBreakdown {
  workers: number;
  d1: { reads: number; writes: number; storage: number; total: number };
  r2: {
    storage: number;
    classA: number;
    classB: number;
    egress: number;
    total: number;
  };
  kv: { reads: number; writes: number; storage: number; total: number };
  durableObjects: {
    requests: number;
    duration: number;
    storage: number;
    total: number;
  };
  ai: { neurons: number; total: number };
  total: number;
  period: "daily" | "monthly";
}
```

Also define the full service registry (updated to include Warden, Meadow, and Queen Firefly):

- 11+ Workers with their endpoints and health check paths (engine, auth, meadow, meadow-poller, warden, cdn, payments, durable-objects, queen, plus cron workers)
- 9 D1 databases with IDs (including grove-lattice used by Warden for tenant secrets)
- 6 R2 buckets (including amber.grove.place used by Firefly for state sync)
- 8+ KV namespaces (add Warden nonce storage, Warden rate limit counters, Meadow CACHE_KV)
- 7+ Durable Object classes (plus Queen Firefly's LoomDO, and planned Meadow UserFeedDO/PostMetaDO)

### Step 2: D1 Migration for Observability Tables

**File:** `packages/engine/migrations/XXXX_observability_metrics.sql`

Add tables to grove-engine-db for storing collected metrics:

**Timestamp convention:** All timestamps use INTEGER (Unix epoch seconds), consistent with the rest of the engine schema. No `datetime('now')` TEXT fields — keeps cross-table queries and sorting straightforward.

```sql
-- Observability metrics (time-series)
CREATE TABLE IF NOT EXISTS observability_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  recorded_at INTEGER NOT NULL,
  metadata TEXT
);

-- Primary query pattern: WHERE service_name = ? AND recorded_at > ? ORDER BY recorded_at
CREATE INDEX idx_obs_metrics_service_time ON observability_metrics(service_name, recorded_at);

-- Health check results
CREATE TABLE IF NOT EXISTS observability_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  is_healthy INTEGER NOT NULL,
  error_message TEXT,
  checked_at INTEGER NOT NULL
);

CREATE INDEX idx_obs_health_endpoint_time ON observability_health_checks(endpoint, checked_at);

-- D1 database stats
CREATE TABLE IF NOT EXISTS observability_d1_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  size_bytes INTEGER,
  rows_read INTEGER,
  rows_written INTEGER,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_obs_d1_name_time ON observability_d1_stats(database_name, recorded_at);

-- R2 bucket stats
CREATE TABLE IF NOT EXISTS observability_r2_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_name TEXT NOT NULL,
  object_count INTEGER,
  total_size_bytes INTEGER,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_obs_r2_bucket_time ON observability_r2_stats(bucket_name, recorded_at);

-- KV namespace stats
CREATE TABLE IF NOT EXISTS observability_kv_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace_name TEXT NOT NULL,
  namespace_id TEXT NOT NULL,
  reads INTEGER DEFAULT 0,
  writes INTEGER DEFAULT 0,
  deletes INTEGER DEFAULT 0,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_obs_kv_ns_time ON observability_kv_stats(namespace_name, recorded_at);

-- Durable Object stats (self-reported)
CREATE TABLE IF NOT EXISTS observability_do_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT NOT NULL,
  active_count INTEGER DEFAULT 0,
  hibernating_count INTEGER DEFAULT 0,
  storage_bytes INTEGER DEFAULT 0,
  alarm_count INTEGER DEFAULT 0,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_obs_do_class_time ON observability_do_stats(class_name, recorded_at);

-- Daily cost aggregates
-- NOTE: estimated_cost_usd is calculated at collection time using the CLOUDFLARE_PRICING
-- constants active at that moment. If pricing changes, historical rows are NOT retroactively
-- recalculated — they reflect what the cost *was* under the pricing in effect when collected.
-- The raw usage columns (d1_reads, r2_class_a, etc.) are always accurate, so a retroactive
-- recalculation can be done via a one-off script if needed.
CREATE TABLE IF NOT EXISTS observability_daily_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  service_name TEXT NOT NULL,
  d1_reads INTEGER DEFAULT 0,
  d1_writes INTEGER DEFAULT 0,
  r2_class_a INTEGER DEFAULT 0,
  r2_class_b INTEGER DEFAULT 0,
  r2_storage_bytes INTEGER DEFAULT 0,
  kv_reads INTEGER DEFAULT 0,
  kv_writes INTEGER DEFAULT 0,
  worker_requests INTEGER DEFAULT 0,
  do_requests INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,
  pricing_version TEXT DEFAULT '2026-02-17',
  UNIQUE(date, service_name)
);

-- Alert thresholds
CREATE TABLE IF NOT EXISTS observability_alert_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold_value REAL NOT NULL,
  severity TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Alert history
CREATE TABLE IF NOT EXISTS observability_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metric_type TEXT,
  metric_value REAL,
  threshold_value REAL,
  triggered_at INTEGER NOT NULL,
  resolved_at INTEGER,
  acknowledged INTEGER DEFAULT 0
);

CREATE INDEX idx_obs_alerts_service_time ON observability_alerts(service_name, triggered_at);
CREATE INDEX idx_obs_alerts_unresolved ON observability_alerts(resolved_at) WHERE resolved_at IS NULL;
```

### Step 3: Cloudflare API Collector Service

**File:** `packages/engine/src/lib/server/observability/collectors/`

Build collector modules that query Cloudflare APIs:

1. **`cloudflare-analytics.ts`** - Workers request/error/latency via GraphQL Analytics API
2. **`d1-collector.ts`** - Database size, read/write counts via D1 HTTP API
3. **`r2-collector.ts`** - Bucket object counts and storage via R2 API
4. **`kv-collector.ts`** - Namespace operation counts via KV Analytics API
5. **`health-checker.ts`** - Ping `/health` endpoints on all HTTP workers
6. **`do-collector.ts`** - Aggregate DO stats from self-reported metrics

The Cloudflare Analytics GraphQL API endpoint is `https://api.cloudflare.com/client/v4/graphql` and requires:

- `CF_OBSERVABILITY_TOKEN` (with Analytics:Read, D1:Read, R2:Read, KV:Read permissions — see Operational Prerequisites for full scope list)
- `CF_ACCOUNT_ID`

### Step 4: Cost Calculator

**File:** `packages/engine/src/lib/server/observability/costs.ts`

Calculate estimated costs based on Cloudflare pricing.

**Pricing constants** live in a single `CLOUDFLARE_PRICING` object at the top of `costs.ts` with a `PRICING_LAST_VERIFIED` date. This makes it obvious where to update when Cloudflare changes pricing (they have historically — e.g., R2 egress went free, Workers paid tier changed). Each constant includes a comment with the pricing page URL for verification.

```typescript
// Last verified: 2026-02-17
// Source: https://developers.cloudflare.com/workers/platform/pricing/
const CLOUDFLARE_PRICING = {
  workers: { perMillionRequests: 0.5, freeRequests: 10_000_000 },
  d1: { perMillionReads: 0.75, perMillionWrites: 1.0, perGBStorage: 0.75 },
  r2: { perGBStorage: 0.015, perMillionClassA: 4.5, perMillionClassB: 0.36 },
  kv: { perMillionReads: 0.5, perMillionWrites: 5.0, perGBStorage: 0.5 },
  durableObjects: { perMillionRequests: 0.15, perMillionGBSeconds: 12.5 },
  workersAI: { freeNeuronsPerDay: 10_000, perThousandNeurons: 0.011 },
} as const;
```

Also add Firefly external provider costs for Queen Firefly ephemeral servers:

```typescript
const FIREFLY_PROVIDER_PRICING = {
  hetzner: { cx22: 0.008 }, // per hour
  flyio: { shared1x: 0.02 },
  railway: { starter: 0.015 },
  digitalocean: { s1vcpu: 0.01 },
} as const;
```

A future enhancement could move these to a D1 table editable from the admin dashboard, but hardcoded constants with a verified date is the right starting point — it's transparent, auditable, and easy to update.

### Step 5: Existing Data Aggregation Service

**File:** `packages/engine/src/lib/server/observability/aggregators/`

Surface data that already exists in D1:

1. **`lumen-aggregator.ts`** - Query `lumen_usage` for AI cost, token usage, provider breakdown, quota status
2. **`petal-aggregator.ts`** - Query `petal_security_log` for moderation activity, block rates, NCMEC queue status
3. **`thorn-aggregator.ts`** - Query `thorn_moderation_log` for text moderation stats, flagged content counts
4. **`sentinel-aggregator.ts`** - Query `sentinel_runs` for recent test results, baseline comparisons
5. **`clearing-aggregator.ts`** - Query status tables for current component health, incident history
6. **`warden-aggregator.ts`** - Query `warden_audit_log` for request volume, auth failure rates, per-service latency, scope denials, nonce reuse attempts, rate limit hit rates. Warden already logs structured audit data to D1 — this aggregator surfaces it
7. **`meadow-aggregator.ts`** - Query `meadow_posts`, `meadow_votes`, `meadow_reactions`, `meadow_reports` for feed health, engagement rates, report volume. Also query Meadow Poller KV poll state keys (`poll:{tenantId}`) for polling success rates, consecutive error counts, and feed freshness (time since last successful poll per tenant)
8. **`firefly-aggregator.ts`** - Query Queen Firefly's `jobs` and `runners` tables for active pool size, job queue depth, session durations, per-provider costs, and orphan instance count. Also query R2 (`amber.grove.place`) for state sync sizes per consumer (Bloom workspaces, Outpost worlds, CI cache)

### Step 6: Observability API Endpoints

**Routes:** `packages/landing/src/routes/api/admin/observability/`

Admin-only API endpoints (require Wayfinder auth). These live in the **landing** package since the dashboard is in the landing's Arbor:

```
GET /api/admin/observability/overview        - Full dashboard summary
GET /api/admin/observability/workers         - Worker metrics
GET /api/admin/observability/databases       - D1 metrics
GET /api/admin/observability/storage         - R2 + KV metrics
GET /api/admin/observability/durable-objects - DO status
GET /api/admin/observability/costs           - Cost breakdown (CF + Firefly providers)
GET /api/admin/observability/lumen           - AI usage details
GET /api/admin/observability/moderation      - Petal + Thorn combined
GET /api/admin/observability/warden          - API gateway: request volume, auth, upstream health
GET /api/admin/observability/meadow          - Feed health, polling status, engagement
GET /api/admin/observability/firefly         - Pool status, job queue, costs, orphans
GET /api/admin/observability/alerts          - Active and historical alerts
POST /api/admin/observability/collect        - Trigger manual collection
POST /api/admin/observability/thresholds     - Configure alert thresholds
```

The server-side observability library (types, collectors, aggregators, cost calculator) lives in the **engine** package so it's importable by any consumer. The API routes in the landing package call into the engine's observability module.

### Step 7: Vista Dashboard — Own Chrome in Landing's Arbor

**Routes:** `packages/landing/src/routes/arbor/vista/`

Vista lives inside the landing's Arbor admin panel but gets its **own ArborPanel chrome** — a dedicated sidebar with 12 sub-pages, its own brand title, and its own navigation. This is a new pattern: a "sub-arbor" that takes over the full layout when you enter it.

**How it works (SvelteKit nested layout with chrome swap):**

The parent Arbor layout (`/arbor/+layout.svelte`) already conditionally skips ArborPanel for the login page. Vista extends this pattern:

```svelte
<!-- In /arbor/+layout.svelte — add Vista to the bypass list -->
let isLoginPage = $derived(page.url.pathname === '/arbor/login');
let isVistaPage = $derived(page.url.pathname.startsWith('/arbor/vista'));

{#if isLoginPage}
  {@render children()}
{:else if isVistaPage}
  <!-- Vista provides its own ArborPanel chrome -->
  <Header showSidebarToggle={true} user={headerUser} userHref="/arbor" />
  {@render children()}
  <div class="arbor-footer-wrapper" class:collapsed={sidebarCollapsed}>
    <Footer />
  </div>
{:else}
  <!-- Standard Arbor chrome -->
  <Header showSidebarToggle={true} user={headerUser} userHref="/arbor" />
  <ArborPanel ...>{@render children()}</ArborPanel>
  <Footer ... />
{/if}
```

Then Vista's own layout renders its own ArborPanel:

```svelte
<!-- In /arbor/vista/+layout.svelte -->
<script lang="ts">
  import { ArborPanel } from '@autumnsgrove/groveengine/ui/arbor';
  import {
    LayoutDashboard, Server, Database, HardDrive,
    Box, DollarSign, Brain, Shield, Lock,
    Flower2, Flame, Bell, ArrowLeft
  } from 'lucide-svelte';

  const vistaNav = [
    { href: '/arbor', label: 'Back to Admin', icon: ArrowLeft },
    { kind: 'divider', label: 'Vista', style: 'grove' },
    { href: '/arbor/vista', label: 'Overview', icon: LayoutDashboard },
    { href: '/arbor/vista/workers', label: 'Workers', icon: Server },
    { href: '/arbor/vista/databases', label: 'Databases', icon: Database },
    { href: '/arbor/vista/storage', label: 'Storage', icon: HardDrive },
    { href: '/arbor/vista/durable-objects', label: 'Durable Objects', icon: Box },
    { href: '/arbor/vista/costs', label: 'Costs', icon: DollarSign },
    { kind: 'divider', label: 'Services', style: 'line' },
    { href: '/arbor/vista/ai', label: 'AI Usage', icon: Brain },
    { href: '/arbor/vista/moderation', label: 'Moderation', icon: Shield },
    { href: '/arbor/vista/warden', label: 'Warden', icon: Lock },
    { href: '/arbor/vista/meadow', label: 'Meadow', icon: Flower2 },
    { href: '/arbor/vista/firefly', label: 'Firefly', icon: Flame },
    { kind: 'divider', style: 'line' },
    { href: '/arbor/vista/alerts', label: 'Alerts', icon: Bell },
  ];
</script>

<ArborPanel
  navItems={vistaNav}
  brandTitle="Vista"
  user={data.user}
  onLogout={handleLogoutClick}
>
  {@render children()}
</ArborPanel>
```

**Key design decisions:**

- "Back to Admin" is the first nav item — always one click to return to the main Arbor
- Vista groups nav into Infrastructure (Workers, DBs, Storage, DOs, Costs) and Services (AI, Moderation, Warden, Meadow, Firefly) with dividers
- Alerts gets its own section at the bottom since it's cross-cutting
- `brandTitle="Vista"` replaces "Admin" in the sidebar header
- Auth is inherited from the parent `/arbor/+layout.server.ts` — no extra auth needed
- Vista reuses the same `sidebarStore` so mobile toggle still works

**Route structure:**

```
packages/landing/src/routes/arbor/vista/
├── +layout.svelte           (Vista chrome — own ArborPanel)
├── +layout.server.ts        (optional: load overview data)
├── +page.svelte             (Overview dashboard)
├── workers/+page.svelte
├── databases/+page.svelte
├── storage/+page.svelte
├── durable-objects/+page.svelte
├── costs/+page.svelte
├── ai/+page.svelte
├── moderation/+page.svelte
├── warden/+page.svelte
├── meadow/+page.svelte
├── firefly/+page.svelte
└── alerts/+page.svelte
```

**Dashboard page content (all pages):**

1. **Overview** (`+page.svelte`) - Hero stats grid, service health summary, sparkline charts, active alerts, 24h cost estimate
2. **Workers** (`workers/+page.svelte`) - Table of all workers with status, request counts, error rates, latency
3. **Databases** (`databases/+page.svelte`) - D1 database cards showing size, read/write activity, growth trends
4. **Storage** (`storage/+page.svelte`) - R2 buckets and KV namespaces with object counts, storage sizes
5. **Durable Objects** (`durable-objects/+page.svelte`) - DO class breakdown showing active/hibernating counts
6. **Costs** (`costs/+page.svelte`) - Daily/monthly cost breakdown with projections (Cloudflare + Firefly provider costs)
7. **AI Usage** (`ai/+page.svelte`) - Lumen cost, token usage, provider breakdown, quota status
8. **Moderation** (`moderation/+page.svelte`) - Combined Petal + Thorn activity
9. **Warden** (`warden/+page.svelte`) - API gateway health: request volume, auth breakdown (service-binding vs challenge-response), per-service latency, upstream API health, nonce reuse alerts, rate limit consumption, cost attribution per agent
10. **Meadow** (`meadow/+page.svelte`) - Feed health: polling success rate per tenant, feed freshness gauge, note creation rates, engagement stats (votes/reactions), report queue, rate limit hit rates, auth failure tracking
11. **Firefly** (`firefly/+page.svelte`) - Pool dashboard: active/warm/ephemeral runners, job queue depth, ignition/fade times, session costs by provider, orphan instance alerts, R2 state sync sizes per consumer
12. **Alerts** (`alerts/+page.svelte`) - Active alerts, threshold configuration, alert history

Use engine chart components (`@autumnsgrove/groveengine/ui/charts`) and glass design pattern.

**Sidebar link from main Arbor:** Add to the Wayfinder section of the parent layout:

```typescript
// In /arbor/+layout.svelte wayfinderItems
{ href: '/arbor/vista', label: 'Vista', icon: Eye }
```

### Step 8: DO Self-Reporting (Instrument Existing DOs)

Add lifecycle tracking to existing Durable Objects:

**In each DO class:** Add a method that reports its status back to the observability system:

```typescript
// In TenantDO, PostMetaDO, etc.
async reportMetrics(): Promise<DOInstanceMetrics> {
  return {
    className: 'TenantDO',
    instanceId: this.state.id.toString(),
    isActive: true,
    isHibernating: false,
    storageBytes: await this.getStorageSize(),
    lastAlarmAt: this.lastAlarmTimestamp,
    uptimeMs: Date.now() - this.createdAt,
  };
}
```

Also add a `/do-metrics` endpoint on the durable-objects worker that aggregates across instances.

**Dependency note:** The cron collector (Step 9) and admin API (Step 6) will surface DO metrics, but until DOs actually implement `reportMetrics()`, those endpoints return empty data. To avoid misleading gaps in the dashboard:

- The DO collector should return a clear `{ status: 'not_instrumented', className: '...' }` response for DOs that haven't implemented self-reporting yet
- The dashboard should render uninstrumented DOs as "awaiting instrumentation" rather than showing zeros (which implies "healthy with zero activity")
- Step 8 can ship incrementally — instrument one DO class at a time, dashboard reflects which ones report real data

### Step 9: Cron Collection Job

**Files:**

- `packages/engine/src/lib/server/observability/scheduler.ts` — Collection orchestrator
- `packages/engine/src/routes/api/admin/observability/collect/+server.ts` — Manual trigger endpoint (already in Step 6)
- `packages/engine/wrangler.toml` — Cron trigger registration

**Trigger mechanism:** Cloudflare cron trigger on the landing worker, running every 5 minutes.

```toml
# In packages/landing/wrangler.toml
[triggers]
crons = ["*/5 * * * *"]
```

The `scheduled` event handler calls the collection orchestrator:

```typescript
// In packages/landing/src/worker.ts (or equivalent entry point)
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const collector = createObservabilityCollector(env);
    ctx.waitUntil(collector.runFullCollection());
  },
};
```

**Collection orchestrator** (`scheduler.ts`) coordinates all collectors in sequence:

```typescript
async runFullCollection(): Promise<CollectionResult> {
  const results = {
    startedAt: Date.now(),
    collectors: {} as Record<string, CollectorResult>,
  };

  // 1. Cloudflare API collectors (Workers, D1, R2, KV stats)
  //    These hit external APIs — run in parallel with Promise.allSettled
  const [workers, d1, r2, kv] = await Promise.allSettled([
    this.collectWorkerMetrics(),
    this.collectD1Metrics(),
    this.collectR2Metrics(),
    this.collectKVMetrics(),
  ]);

  // 2. Health checks — ping all worker /health endpoints in parallel
  const healthResults = await this.runHealthChecks();

  // 3. DO metrics — query the durable-objects worker's /do-metrics endpoint
  const doResults = await this.collectDOMetrics();

  // 4. Internal aggregators — query D1 tables for Lumen, Petal, Thorn, etc.
  //    These are cheap local queries, run in parallel
  const aggregated = await Promise.allSettled([
    this.aggregateLumen(),
    this.aggregatePetal(),
    this.aggregateThorn(),
    this.aggregateSentinel(),
    this.aggregateClearing(),
    this.aggregateWarden(),
    this.aggregateMeadow(),
    this.aggregateFirefly(),
  ]);

  // 5. Calculate and store daily costs
  await this.calculateDailyCosts();

  // 6. Evaluate alert thresholds against fresh data
  await this.evaluateAlerts();

  // 7. Write collection metadata (duration, errors, next run)
  results.completedAt = Date.now();
  return results;
}
```

**Data freshness:** At 5-minute intervals, the `observability_metrics` table grows by ~200 rows/day per service (12 collections/hour x ~1-2 rows per collector). With 11 services, that's ~2,200 rows/day or ~66,000 rows/month. The indexes from Step 2 keep queries fast. A retention job (delete rows older than 90 days) should run daily as a separate cron or as part of the collection cycle.

**Manual collection** is also available via `POST /api/admin/observability/collect` (Step 6) for on-demand refresh from the Vista dashboard. This calls the same `runFullCollection()` method.

**Failure handling:** Each collector runs independently via `Promise.allSettled` — if one Cloudflare API times out, the others still complete. Failed collectors log the error and the dashboard shows stale data with a "last collected at" timestamp rather than no data.

### Step 10: Security-Adjacent Monitoring (v1.0 Audit Findings)

The v1.0 readiness audit identified operational gaps where observability directly supports security posture:

1. **KV health monitoring** — The rate limiter fails open when KV is unavailable (audit finding M-5). Add a KV connectivity check to the health checker that alerts when KV operations start failing, since this silently disables rate limiting across all services.

2. **Auth failure rate tracking** — Track 401/403 rates across all services (engine, Meadow, Warden). A spike in auth failures could indicate session expiry issues, credential rotation problems, or active attack attempts.

3. **Sanitization bypass detection** — Monitor for unusual patterns in content creation (posts, notes, comments) that might indicate XSS attempts getting through. Not a real-time filter (that's Thorn's job), but a signal for the alert system.

These aren't new services to build — they're alert thresholds and aggregation queries that layer on top of the existing collector infrastructure.

---

## File Summary

| File                                                                              | Purpose                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/engine/src/lib/server/observability/types.ts`                           | All observability types, service registry, constants               |
| `packages/engine/src/lib/server/observability/index.ts`                           | Main orchestrator — coordinates all collectors and aggregators     |
| `packages/engine/src/lib/server/observability/costs.ts`                           | Cloudflare + Firefly provider pricing calculator                   |
| `packages/engine/src/lib/server/observability/collectors/cloudflare-analytics.ts` | CF GraphQL API collector                                           |
| `packages/engine/src/lib/server/observability/collectors/d1-collector.ts`         | D1 metrics via API                                                 |
| `packages/engine/src/lib/server/observability/collectors/r2-collector.ts`         | R2 metrics via API                                                 |
| `packages/engine/src/lib/server/observability/collectors/kv-collector.ts`         | KV metrics via API (includes KV health check for rate limiter M-5) |
| `packages/engine/src/lib/server/observability/collectors/health-checker.ts`       | Worker health pings                                                |
| `packages/engine/src/lib/server/observability/collectors/do-collector.ts`         | DO status aggregation (graceful uninstrumented fallback)           |
| `packages/engine/src/lib/server/observability/aggregators/lumen-aggregator.ts`    | Existing Lumen data                                                |
| `packages/engine/src/lib/server/observability/aggregators/petal-aggregator.ts`    | Existing Petal data                                                |
| `packages/engine/src/lib/server/observability/aggregators/thorn-aggregator.ts`    | Existing Thorn data                                                |
| `packages/engine/src/lib/server/observability/aggregators/sentinel-aggregator.ts` | Existing Sentinel data                                             |
| `packages/engine/src/lib/server/observability/aggregators/clearing-aggregator.ts` | Existing Clearing data                                             |
| `packages/engine/src/lib/server/observability/aggregators/warden-aggregator.ts`   | Warden audit log, auth metrics, upstream API health                |
| `packages/engine/src/lib/server/observability/aggregators/meadow-aggregator.ts`   | Feed health, polling status, engagement, report queue              |
| `packages/engine/src/lib/server/observability/aggregators/firefly-aggregator.ts`  | Pool status, job queue, session costs, orphan detection            |
| `packages/engine/migrations/XXXX_observability_metrics.sql`                       | D1 schema for metrics storage                                      |
| `packages/landing/src/routes/api/admin/observability/[...routes]`                 | API endpoints (14 GET + 2 POST)                                    |
| `packages/landing/src/routes/arbor/vista/+layout.svelte`                          | Vista chrome — own ArborPanel with 12-page nav                     |
| `packages/landing/src/routes/arbor/vista/[...pages]`                              | Dashboard UI (12 pages)                                            |
| `packages/landing/src/routes/arbor/+layout.svelte`                                | Modified — adds Vista bypass + sidebar link                        |
| `packages/durable-objects/src/*/metrics.ts`                                       | DO self-reporting additions                                        |

---

## Issue Coverage

| Issue                       | What We Build                                                               | Status After           |
| --------------------------- | --------------------------------------------------------------------------- | ---------------------- |
| **#609 (Vista Epic)**       | Full observability foundation built in the monorepo                         | Addressed              |
| **#610 (Vista Phase 1)**    | Migration tables created in grove-engine-db, reuses existing Heartwood auth | Addressed              |
| **#611 (Vista Phase 2)**    | All collector code written and functional                                   | Addressed (code ready) |
| **#612 (Vista Phase 3)**    | Alert threshold tables and evaluation logic                                 | Addressed (code ready) |
| **#613 (Vista Phase 4)**    | API endpoints in engine (same auth, same routes)                            | Addressed              |
| **#614 (Vista Phase 5)**    | Dashboard UI in Arbor admin panel                                           | Addressed              |
| **#615 (Vista Phase 6)**    | Cost tracking page, uptime grid                                             | Addressed              |
| **#616 (Vista Phase 7)**    | Deferred (marketing analytics is lower priority)                            | Not addressed          |
| **#598 (Songbird)**         | Types ready; integration point for when Songbird ships                      | Partially addressed    |
| **#1024 (Langfuse)**        | Deferred (requires Langfuse account setup)                                  | Not addressed          |
| **#914 (QF Costs)**         | Deferred (requires Queen Firefly to exist first)                            | Not addressed          |
| **#915 (QF Dashboard)**     | Deferred                                                                    | Not addressed          |
| **#916 (QF Notifications)** | Deferred                                                                    | Not addressed          |

---

## What Implementation Delivers

1. **Unified observability types** covering every Cloudflare resource in the infrastructure, including Warden, Meadow, and Firefly
2. **D1 migration** for metrics, health checks, costs, and alerts
3. **Collector code** ready to query Cloudflare APIs for Workers, D1, R2, KV, and DO metrics
4. **8 aggregators** surfacing existing data: Lumen, Petal, Thorn, Sentinel, Clearing, Warden, Meadow, Firefly
5. **Cost calculator** with versioned Cloudflare pricing constants + Firefly provider costs
6. **14 admin API endpoints** for all observability data
7. **12 dashboard pages** in the Arbor admin panel with glass design
8. **DO instrumentation** with graceful fallback for uninstrumented classes
9. **Alert infrastructure** with configurable thresholds, history tracking, and security-adjacent monitoring (KV health, auth failure rates)

What remains for a follow-up session:

- Deploy and test with real Cloudflare API tokens (see Operational Prerequisites for required scopes)
- Set up cron triggers for automated collection
- Add Resend email alerting
- Langfuse integration (requires account)
- Queen Firefly job/runner instrumentation (requires Queen Firefly to be deployed)
