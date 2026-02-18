---
title: Vista — Observability Dashboard
description: Grove's internal observability platform — Wayfinder-only dashboard with Cloudflare metrics, health checks, alert thresholds, and cost projections
category: specs
lastUpdated: "2026-02-18"
---

# Vista — Observability Dashboard

> Grove's single pane of glass for infrastructure health: metrics from every Cloudflare service, health checks on every worker, configurable alert thresholds, and cost projections — all behind a Wayfinder-only admin dashboard.

---

## What It Does

- **Collects metrics every 5 minutes** from Cloudflare's Analytics GraphQL API (worker request volume, error rates, latency percentiles), D1 HTTP API (database size, row counts), R2 API (object counts, storage), and KV Analytics API (read/write operation counts)
- **Pings all HTTP workers** at their `/health` endpoints and records response time and status per check
- **Surfaces existing data** from eight internal services — Lumen (AI costs), Petal (image moderation), Thorn (text moderation), Sentinel (load tests), Clearing (status page), Warden (API gateway), Meadow (community feed), and Firefly (ephemeral servers) — by querying the D1 tables those services already write to
- **Evaluates alert thresholds** at every 5-minute collection cycle: compares the latest metric value for each (service, metric type) pair against configured thresholds and creates or resolves alert records in D1
- **Projects costs** using versioned Cloudflare pricing constants; calculates daily estimates per resource type and projects to monthly via 30-day multiplication
- **Runs 90-day retention cleanup** on the daily midnight cron, pruning all time-series tables to keep D1 from growing unboundedly

---

## Architecture

### Where it lives

```
packages/engine/src/lib/server/observability/   Core library (shared types, collectors, aggregators, costs, scheduler)
packages/workers/vista-collector/               Standalone cron Worker (collects on schedule, also accepts manual POST)
packages/landing/src/routes/arbor/vista/        Dashboard UI (12 pages inside Arbor's admin panel)
packages/landing/src/routes/api/admin/observability/  Admin-only API endpoints
```

The observability library is in the **engine** package so it can be imported by any consumer. The dashboard lives in the **landing** package alongside the rest of Arbor — no separate deployment, no separate D1 or KV provisioning.

### How the pieces connect

```
grove-vista-collector (cron Worker)
  └── createObservabilityCollector(env)  [engine: scheduler.ts]
        ├── Step 1: CF API collectors (Workers, D1, R2, KV) — parallel, fail-safe
        ├── Step 2: Health checks on all HTTP workers — parallel
        ├── Step 3: DO metrics via do-collector
        ├── Step 4: Internal aggregators (Lumen, Petal, Thorn, Sentinel,
        │           Clearing, Warden, Meadow, Firefly) — parallel D1 queries
        ├── Step 5: Alert threshold evaluation — two batch reads + in-memory loop
        └── Step 6: 90-day retention cleanup (daily midnight cron only)
              └── All writes to grove-engine-db (D1)

packages/landing API routes (GET /api/admin/observability/*)
  └── Read from grove-engine-db → serve to dashboard

packages/landing Arbor Vista pages (/arbor/vista/*)
  └── Load data from API routes → render with glass design system
```

### D1 tables (all in grove-engine-db)

| Table                            | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `observability_metrics`          | Time-series worker metrics (requests, errors, latency)      |
| `observability_health_checks`    | Per-endpoint health check results                           |
| `observability_d1_stats`         | D1 database size and row counts per collection              |
| `observability_r2_stats`         | R2 bucket object counts and storage per collection          |
| `observability_kv_stats`         | KV namespace read/write counts per collection               |
| `observability_do_stats`         | Durable Object class instance and storage counts            |
| `observability_daily_costs`      | Daily cost aggregates per service, with pricing version     |
| `observability_alert_thresholds` | Configurable alert rules (service, metric, operator, value) |
| `observability_alerts`           | Alert history — triggered and resolved events               |
| `observability_collection_log`   | One row per collection run: timing, success/fail counts     |

---

## Deployment

### Secrets and bindings

The collector worker needs one secret:

```bash
# Store in vault (never echoes the value)
gw secret set CF_OBSERVABILITY_TOKEN

# Push to the deployed worker
gw secret apply CF_OBSERVABILITY_TOKEN --worker grove-vista-collector
```

The `CF_ACCOUNT_ID` is non-sensitive and hardcoded in `wrangler.toml` as a `[vars]` entry. No vault needed for it.

**Required token scopes** (create at dash.cloudflare.com → My Profile → API Tokens):

- `Account Analytics:Read` — Worker metrics via GraphQL
- `Account D1:Read` — Database size, row counts
- `Account Workers R2 Storage:Read` — Bucket stats
- `Account Workers KV Storage:Read` — Namespace operation counts
- `Account Workers Scripts:Read` — Worker list

### Deploy

The collector is a standalone Cloudflare Worker. After setting the secret:

```bash
# From packages/workers/vista-collector/
wrangler deploy
```

The landing package (which hosts the dashboard and API routes) deploys automatically on push to main via GitHub Actions, alongside the rest of the landing site.

---

## Accessing the Dashboard

**Route:** `/arbor/vista/`

**Access:** Wayfinder only. The layout server checks `isWayfinder(user.email)` and redirects to `/arbor` if the check fails. Parent Arbor auth still runs first — unauthenticated requests never reach Vista.

### Dashboard pages

| Page            | Route                          | What it shows                                                     |
| --------------- | ------------------------------ | ----------------------------------------------------------------- |
| Overview        | `/arbor/vista`                 | Hero stats, service health grid, active alerts, 24h cost estimate |
| Workers         | `/arbor/vista/workers`         | Request volume, error rates, latency per worker                   |
| Databases       | `/arbor/vista/databases`       | D1 size, read/write counts, growth per database                   |
| Storage         | `/arbor/vista/storage`         | R2 object counts, storage; KV read/write patterns                 |
| Durable Objects | `/arbor/vista/durable-objects` | Active/hibernating instance counts per DO class                   |
| Costs           | `/arbor/vista/costs`           | Daily/monthly cost breakdown and projections                      |
| AI Usage        | `/arbor/vista/ai`              | Lumen: token usage, cost, provider breakdown, quota               |
| Moderation      | `/arbor/vista/moderation`      | Petal + Thorn combined: block rates, NCMEC queue, flagged content |
| Warden          | `/arbor/vista/warden`          | API gateway: request volume, auth failures, upstream API health   |
| Meadow          | `/arbor/vista/meadow`          | Feed health: polling success, feed freshness, engagement, reports |
| Firefly         | `/arbor/vista/firefly`         | Pool status: active runners, job queue, session costs, orphans    |
| Alerts          | `/arbor/vista/alerts`          | Active alerts, alert history, threshold configuration             |

Vista uses its own `ArborPanel` sidebar — the parent Arbor layout detects `/arbor/vista` routes and skips rendering the standard ArborPanel, letting Vista render its own with its own nav and "Vista" brand title. A "Back to Admin" link is always the first nav item.

---

## Alert Thresholds

### Configuration

Thresholds are managed via the Alerts page at `/arbor/vista/alerts`. Each threshold specifies:

- `service_name` — which service to watch (e.g., `grove-lattice`, `meadow`)
- `metric_type` — what to measure (e.g., `error_rate`, `latency_p95`)
- `operator` — `gt`, `lt`, `gte`, `lte`, or `eq`
- `threshold_value` — the numeric boundary
- `severity` — `info`, `warning`, or `critical`
- `enabled` — can be toggled without deleting

### How evaluation works

Alert evaluation runs at the end of every 5-minute collection cycle. To avoid N+1 D1 queries (one per threshold), it uses two batch reads:

1. One query fetches the latest metric value for every `(service_name, metric_type)` pair that has a threshold configured — using a self-join on the covering index so each group lookup is O(log n) rather than a full scan
2. One query fetches all currently active (unresolved) alert keys

The per-threshold loop then works entirely in memory, only writing to D1 when an alert actually needs to be created or resolved. This keeps D1 write pressure proportional to state changes, not to the number of thresholds.

**State transitions:**

- Threshold exceeded + no active alert → `INSERT` into `observability_alerts`
- Threshold clear + active alert exists → `UPDATE resolved_at` on the active alert row

---

## Retention

All time-series tables are pruned to 90 days automatically. The cleanup runs on the daily midnight UTC cron (`0 0 * * *`) — the same worker that runs every 5 minutes. The scheduler detects the daily cron by checking `new Date().getUTCHours() === 0` (both cron triggers are passed as `trigger="cron"` to `runFullCollection`, so the raw cron expression isn't available at that point).

Tables pruned: `observability_metrics`, `observability_health_checks`, `observability_d1_stats`, `observability_r2_stats`, `observability_kv_stats`, `observability_do_stats`, `observability_collection_log`.

The `observability_alerts` and `observability_daily_costs` tables are not pruned — alert history and cost records are worth keeping longer.

---

## Known Limitations and Future Work

- **Firefly section**: Stub aggregator only. The firefly-aggregator queries the `jobs` and `runners` tables that Queen Firefly will write to, but Queen Firefly hasn't shipped yet. The page renders placeholder state until the tables exist.
- **DO metrics**: The do-collector currently returns placeholder data. Durable Object classes would need to implement a `reportMetrics()` method and expose a `/do-metrics` endpoint on the durable-objects worker. The dashboard renders "awaiting instrumentation" rather than zeros so nothing looks falsely healthy.
- **KV caching on aggregator endpoints**: The API routes read directly from D1 on every request. A KV cache layer with a 5-minute TTL (matching the collection interval) would reduce D1 read pressure significantly — especially for the overview page which queries many tables.
- **Collector batch writes**: Each collector inserts metric rows one at a time. D1 batch inserts (via `db.batch()`) would reduce round-trips and improve collection speed on the 5-minute schedule.
- **Resend email alerting**: The alert threshold evaluation creates rows in D1 but doesn't yet send email notifications. Wiring Zephyr (the email gateway) into the alert creation path is the next natural step.
- **Langfuse integration**: Deferred — requires a Langfuse account and API key setup.
- **Marketing acquisition analytics (Vista Phase 7)**: Deferred — lower priority than infrastructure health.
