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

Also define the full service registry:

- 9 Workers with their endpoints and health check paths
- 9 D1 databases with IDs
- 6 R2 buckets
- 7 KV namespaces
- 7 Durable Object classes

### Step 2: D1 Migration for Observability Tables

**File:** `packages/engine/migrations/XXXX_observability_metrics.sql`

Add tables to grove-engine-db for storing collected metrics:

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

-- R2 bucket stats
CREATE TABLE IF NOT EXISTS observability_r2_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_name TEXT NOT NULL,
  object_count INTEGER,
  total_size_bytes INTEGER,
  recorded_at INTEGER NOT NULL
);

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

-- Daily cost aggregates
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  acknowledged INTEGER DEFAULT 0
);
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

- `CF_API_TOKEN` (with Analytics:Read, D1:Read, R2:Read, KV:Read permissions)
- `CF_ACCOUNT_ID`

### Step 4: Cost Calculator

**File:** `packages/engine/src/lib/server/observability/costs.ts`

Calculate estimated costs based on Cloudflare pricing:

```
Workers: $0.50/million requests (first 10M free on paid plan)
D1: $0.75/million rows read, $1.00/million rows written, $0.75/GB storage
R2: $0.015/GB storage, $4.50/million Class A ops, $0.36/million Class B ops
KV: $0.50/million reads, $5.00/million writes, $0.50/GB storage
DOs: $0.15/million requests, $12.50/million GB-seconds
Workers AI: 10K neurons/day free, then $0.011/1K neurons
```

### Step 5: Existing Data Aggregation Service

**File:** `packages/engine/src/lib/server/observability/aggregators/`

Surface data that already exists in D1:

1. **`lumen-aggregator.ts`** - Query `lumen_usage` for AI cost, token usage, provider breakdown, quota status
2. **`petal-aggregator.ts`** - Query `petal_security_log` for moderation activity, block rates, NCMEC queue status
3. **`thorn-aggregator.ts`** - Query `thorn_moderation_log` for text moderation stats, flagged content counts
4. **`sentinel-aggregator.ts`** - Query `sentinel_runs` for recent test results, baseline comparisons
5. **`clearing-aggregator.ts`** - Query status tables for current component health, incident history

### Step 6: Observability API Endpoints

**Routes:** `packages/engine/src/routes/api/admin/observability/`

Admin-only API endpoints (require Wayfinder auth):

```
GET /api/admin/observability/overview     - Full dashboard summary
GET /api/admin/observability/workers      - Worker metrics
GET /api/admin/observability/databases    - D1 metrics
GET /api/admin/observability/storage      - R2 + KV metrics
GET /api/admin/observability/durable-objects - DO status
GET /api/admin/observability/costs        - Cost breakdown
GET /api/admin/observability/lumen        - AI usage details
GET /api/admin/observability/moderation   - Petal + Thorn combined
GET /api/admin/observability/alerts       - Active and historical alerts
POST /api/admin/observability/collect     - Trigger manual collection
POST /api/admin/observability/thresholds  - Configure alert thresholds
```

### Step 7: Admin Dashboard UI

**Routes:** `packages/engine/src/routes/(app)/arbor/observability/`

Build dashboard pages within the existing Arbor admin panel:

1. **Overview** (`+page.svelte`) - Hero stats grid, service health summary, sparkline charts, active alerts, 24h cost estimate
2. **Workers** (`workers/+page.svelte`) - Table of all workers with status, request counts, error rates, latency
3. **Databases** (`databases/+page.svelte`) - D1 database cards showing size, read/write activity, growth trends
4. **Storage** (`storage/+page.svelte`) - R2 buckets and KV namespaces with object counts, storage sizes
5. **Durable Objects** (`durable-objects/+page.svelte`) - DO class breakdown showing active/hibernating counts
6. **Costs** (`costs/+page.svelte`) - Daily/monthly cost breakdown with projections
7. **AI Usage** (`ai/+page.svelte`) - Lumen cost, token usage, provider breakdown, quota status
8. **Moderation** (`moderation/+page.svelte`) - Combined Petal + Thorn activity
9. **Alerts** (`alerts/+page.svelte`) - Active alerts, threshold configuration, alert history

Use engine chart components (`@autumnsgrove/groveengine/ui/charts`) and glass design pattern.

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

### Step 9: Cron Collection Job

**Add to engine wrangler.toml:** A cron trigger that runs every 5 minutes to collect metrics.

Alternatively, since we're building inside the engine for now, add a self-triggered collection that runs via:

- A scheduled endpoint called by an external cron (Cloudflare cron trigger)
- Or manual collection from the admin dashboard

---

## File Summary

| File                                                                              | Purpose                                                        |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/engine/src/lib/server/observability/types.ts`                           | All observability types, service registry, constants           |
| `packages/engine/src/lib/server/observability/index.ts`                           | Main orchestrator - coordinates all collectors and aggregators |
| `packages/engine/src/lib/server/observability/costs.ts`                           | Cloudflare pricing calculator                                  |
| `packages/engine/src/lib/server/observability/collectors/cloudflare-analytics.ts` | CF GraphQL API collector                                       |
| `packages/engine/src/lib/server/observability/collectors/d1-collector.ts`         | D1 metrics via API                                             |
| `packages/engine/src/lib/server/observability/collectors/r2-collector.ts`         | R2 metrics via API                                             |
| `packages/engine/src/lib/server/observability/collectors/kv-collector.ts`         | KV metrics via API                                             |
| `packages/engine/src/lib/server/observability/collectors/health-checker.ts`       | Worker health pings                                            |
| `packages/engine/src/lib/server/observability/collectors/do-collector.ts`         | DO status aggregation                                          |
| `packages/engine/src/lib/server/observability/aggregators/lumen-aggregator.ts`    | Existing Lumen data                                            |
| `packages/engine/src/lib/server/observability/aggregators/petal-aggregator.ts`    | Existing Petal data                                            |
| `packages/engine/src/lib/server/observability/aggregators/thorn-aggregator.ts`    | Existing Thorn data                                            |
| `packages/engine/src/lib/server/observability/aggregators/sentinel-aggregator.ts` | Existing Sentinel data                                         |
| `packages/engine/src/lib/server/observability/aggregators/clearing-aggregator.ts` | Existing Clearing data                                         |
| `packages/engine/migrations/XXXX_observability_metrics.sql`                       | D1 schema for metrics storage                                  |
| `packages/engine/src/routes/api/admin/observability/[...routes]`                  | API endpoints                                                  |
| `packages/engine/src/routes/(app)/arbor/observability/[...pages]`                 | Dashboard UI                                                   |
| `packages/durable-objects/src/*/metrics.ts`                                       | DO self-reporting additions                                    |

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

## What This Session Delivers

By the end of this session, you'll have:

1. **Unified observability types** covering every Cloudflare resource in your infrastructure
2. **D1 migration** for metrics, health checks, costs, and alerts
3. **Collector code** ready to query Cloudflare APIs for Workers, D1, R2, KV, and DO metrics
4. **Aggregators** that surface your existing Lumen, Petal, Thorn, Sentinel, and Clearing data
5. **Cost calculator** with accurate Cloudflare pricing
6. **Admin API endpoints** for all observability data
7. **Dashboard pages** in the Arbor admin panel with glass design
8. **DO instrumentation** for self-reporting metrics from all 7 Durable Object classes
9. **Alert infrastructure** with configurable thresholds and history tracking

What remains for a follow-up session:

- Deploy and test with real Cloudflare API tokens
- Set up cron triggers for automated collection
- Add Resend email alerting
- Langfuse integration (requires account)
- Queen Firefly CI observability (requires Queen Firefly)
