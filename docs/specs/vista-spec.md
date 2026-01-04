---
aliases: []
date created: Wednesday, December 31st 2025
date modified: Saturday, January 4th 2026
tags:
  - monitoring
  - infrastructure
  - cloudflare-workers
  - observability
type: tech-spec
---

# Vista — Infrastructure Monitoring

> *A clearing in the forest where the whole grove stretches out before you.*

Grove's infrastructure monitoring dashboard providing real-time metrics, historical data, alerting, and cost tracking. A single pane of glass for all platform services that watches so you don't have to.

**Public Name:** Vista
**Internal Name:** GroveMonitor
**Domain:** `vista.grove.place`
**Repository:** [AutumnsGrove/GroveMonitor](https://github.com/AutumnsGrove/GroveMonitor)
**Last Updated:** December 2025

A vista is a view that opens up: a clearing where you can see the whole forest at once. From here, nothing hides. Vista is Grove's infrastructure monitoring dashboard, providing a single pane of glass for all platform services.

Real-time metrics, historical data, alerting, cost tracking, health checks. All in one beautiful dashboard. Vista watches so you don't have to.

---

## Goals

1. **Single pane of glass** for all 9+ Grove workers and services
2. **Real-time metrics** with historical data retention (90 days)
3. **Alerting** via email (Resend) when things break
4. **Cost tracking** across D1, R2, KV, Workers
5. **Health checks** with uptime monitoring
6. **Beautiful dashboard** that's actually useful
7. **Secure by default** — authentication required via Heartwood

---

## The Difference: Rings vs Vista

| **Rings** | **Vista** |
|-----------|-----------|
| User-facing analytics | Internal infrastructure observability |
| "How are my readers engaging?" | "Are my workers healthy?" |
| For blog authors | For the platform operator |
| Private growth insights | System health, costs, alerts |

Rings tells writers about their readers. Vista tells the grove keeper about the grove itself.

---

## Architecture

```
                            Vista System

 grove-monitor       grove-monitor       vista.grove
    -collector  ───▶      -api       ───▶   .place
   (Cron Worker)       (API Worker)      (Dashboard)
         │                    │                │
         │ Collects from:     │ Stores in:     │ Auth via:
         │                    │                │
         ▼                    ▼                ▼
  Cloudflare APIs       grove-monitor      Heartwood
  • Analytics API           -db (D1)     (auth-api.grove.place)
  • D1 API
  • R2 API              MONITOR_KV
  • Workers API          (real-time)

  Health Checks:
  • All *.grove.place
    sites via /health

Data Flow:
1. User visits vista.grove.place → redirected to Heartwood if not authenticated
2. Heartwood validates admin user → sets grove_session cookie
3. Collector runs every 5 minutes (cron)
4. Fetches metrics from CF APIs + health checks all endpoints
5. Stores time-series in D1, real-time snapshots in KV
6. Dashboard reads from API worker (requires valid session)
7. Alerts sent via email on threshold breaches

### Load Testing Integration

Vista serves as the **validation layer** for Grove's load testing framework. When load tests are executed via the [Sentinel pattern](../patterns/sentinel-pattern.md), Vista provides the infrastructure metrics needed to validate system behavior under stress.

**Load Testing Workflow:**
1. **Sentinel** executes load tests against target services
2. **Vista Collector** monitors infrastructure during test execution
3. **Real-time metrics** captured in KV for live test observation
4. **Historical analysis** stored in D1 for post-test review
5. **Vista LoadTest Package** provides test orchestration integration

**Load Testing Metrics:**
- Request rate validation (target vs actual)
- Error rate under load (baseline vs stressed)
- Latency distribution changes (p50, p95, p99)
- Resource utilization (CPU, memory, database queries)
- Infrastructure cost impact during tests

**Integration Points:**
- Load test results stored alongside normal metrics
- Alert thresholds can be temporarily modified for tests
- Historical data comparison (normal vs test periods)
- Cost tracking includes load test resource usage
```

---

## Security & Authentication

Vista exposes sensitive infrastructure data—database IDs, cost information, system health, and real-time metrics. **Authentication is mandatory**, not optional.

### Heartwood Integration

Vista authenticates through Heartwood (GroveAuth), the centralized authentication system for all Grove services.

**OAuth Client Registration:**

```bash
# 1. Generate client secret
CLIENT_SECRET=$(openssl rand -base64 32)

# 2. Set secrets for Vista dashboard
echo "vista" | wrangler pages secret put GROVEAUTH_CLIENT_ID --project grove-monitor
echo "$CLIENT_SECRET" | wrangler pages secret put GROVEAUTH_CLIENT_SECRET --project grove-monitor
echo "https://vista.grove.place/auth/callback" | wrangler pages secret put GROVEAUTH_REDIRECT_URI --project grove-monitor

# 3. Generate base64url hash for database
SECRET_HASH=$(echo -n "$CLIENT_SECRET" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

# 4. Register in Heartwood database
wrangler d1 execute groveauth --remote --command="
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  '$(uuidgen)',
  'Vista Dashboard',
  'vista',
  '$SECRET_HASH',
  '[\"https://vista.grove.place/auth/callback\"]',
  '[\"https://vista.grove.place\"]'
)"
```

### Session Validation

The dashboard validates sessions on every request:

```typescript
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  // Public routes that don't need auth
  if (event.url.pathname === '/auth/callback') {
    return resolve(event);
  }

  // Validate session with Heartwood
  const response = await fetch('https://auth-api.grove.place/session/validate', {
    method: 'POST',
    headers: { Cookie: event.request.headers.get('Cookie') || '' }
  });

  const { valid, user } = await response.json();

  if (!valid) {
    // Redirect to Heartwood login
    const loginUrl = new URL('https://heartwood.grove.place/login');
    loginUrl.searchParams.set('redirect', event.url.href);
    return Response.redirect(loginUrl.toString(), 302);
  }

  // Only allow admin users (you)
  if (!user.isAdmin) {
    return new Response('Forbidden: Admin access required', { status: 403 });
  }

  event.locals.user = user;
  return resolve(event);
};
```

### Access Control

| Role | Access |
|------|--------|
| Admin (isAdmin: true) | Full dashboard access |
| Regular users | Denied (403 Forbidden) |
| Unauthenticated | Redirected to Heartwood login |

### API Authentication

The API worker also validates sessions for all endpoints:

```typescript
// packages/api/src/middleware/auth.ts
export async function requireAuth(request: Request): Promise<User | Response> {
  const response = await fetch('https://auth-api.grove.place/session/validate', {
    method: 'POST',
    headers: { Cookie: request.headers.get('Cookie') || '' }
  });

  const { valid, user } = await response.json();

  if (!valid || !user.isAdmin) {
    return new Response('Unauthorized', { status: 401 });
  }

  return user;
}
```

---

## Project Structure

```
GroveMonitor/
├── packages/
│   ├── collector/              # Cron worker - data collection
│   │   ├── src/
│   │   │   ├── index.ts        # Main scheduled handler
│   │   │   ├── collectors/
│   │   │   │   ├── cloudflare-analytics.ts
│   │   │   │   ├── d1-metrics.ts
│   │   │   │   ├── r2-metrics.ts
│   │   │   │   ├── kv-metrics.ts
│   │   │   │   └── health-checks.ts
│   │   │   ├── alerting/
│   │   │   │   ├── email.ts
│   │   │   │   └── thresholds.ts
│   │   │   └── types.ts
│   │   └── wrangler.toml
│   │
│   ├── api/                    # API worker for dashboard
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── metrics.ts
│   │   │   │   ├── health.ts
│   │   │   │   ├── alerts.ts
│   │   │   │   └── costs.ts
│   │   │   └── middleware/
│   │   │       └── auth.ts     # Required: Heartwood session validation
│   │   └── wrangler.toml
│   │
│   └── dashboard/              # SvelteKit dashboard UI
│       ├── src/
│       │   ├── hooks.server.ts            # Heartwood auth middleware
│       │   ├── routes/
│       │   │   ├── +page.svelte           # Overview
│       │   │   ├── auth/callback/+server.ts  # OAuth callback
│       │   │   ├── workers/+page.svelte   # Worker details
│       │   │   ├── databases/+page.svelte # D1 metrics
│       │   │   ├── storage/+page.svelte   # R2/KV metrics
│       │   │   ├── health/+page.svelte    # Uptime/health
│       │   │   ├── alerts/+page.svelte    # Alert config
│       │   │   └── costs/+page.svelte     # Cost breakdown
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   │   ├── MetricCard.svelte
│       │   │   │   ├── SparklineChart.svelte
│       │   │   │   ├── StatusBadge.svelte
│       │   │   │   ├── TimeSeriesChart.svelte
│       │   │   │   └── ServiceGrid.svelte
│       │   │   ├── stores/
│       │   │   │   └── metrics.ts
│       │   │   └── api.ts
│       │   └── app.html
│       ├── static/
│       └── wrangler.toml
│
├── migrations/                 # D1 schema
│   ├── 001_initial_schema.sql
│   └── 002_alerts_config.sql
│
├── shared/                     # Shared types/utils
│   ├── types.ts
│   └── constants.ts
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Database Schema (D1)

```sql
-- migrations/001_initial_schema.sql

-- Time-series metrics storage
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,           -- 'groveauth', 'scout', etc.
  metric_type TEXT NOT NULL,            -- 'requests', 'errors', 'latency_p95', etc.
  value REAL NOT NULL,
  unit TEXT,                            -- 'count', 'ms', 'bytes', 'percent'
  recorded_at INTEGER NOT NULL,         -- Unix timestamp
  metadata TEXT                         -- JSON for extra context
);

CREATE INDEX idx_metrics_service_time ON metrics(service_name, recorded_at DESC);
CREATE INDEX idx_metrics_type_time ON metrics(metric_type, recorded_at DESC);

-- Health check results
CREATE TABLE health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,               -- 'https://scout.grove.place'
  status_code INTEGER,
  response_time_ms INTEGER,
  is_healthy INTEGER NOT NULL,          -- 0 or 1
  error_message TEXT,
  checked_at INTEGER NOT NULL
);

CREATE INDEX idx_health_endpoint_time ON health_checks(endpoint, checked_at DESC);

-- D1 database stats
CREATE TABLE d1_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  size_bytes INTEGER,
  rows_read INTEGER,
  rows_written INTEGER,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_d1_stats_db_time ON d1_stats(database_name, recorded_at DESC);

-- R2 bucket stats
CREATE TABLE r2_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_name TEXT NOT NULL,
  object_count INTEGER,
  total_size_bytes INTEGER,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_r2_stats_bucket_time ON r2_stats(bucket_name, recorded_at DESC);

-- Incidents/alerts history
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  severity TEXT NOT NULL,               -- 'critical', 'warning', 'info'
  title TEXT NOT NULL,
  description TEXT,
  triggered_at INTEGER NOT NULL,
  resolved_at INTEGER,
  acknowledged_by TEXT
);

CREATE INDEX idx_incidents_service ON incidents(service_name, triggered_at DESC);
CREATE INDEX idx_incidents_open ON incidents(resolved_at) WHERE resolved_at IS NULL;

-- migrations/002_alerts_config.sql

-- Alert threshold configuration
CREATE TABLE alert_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,           -- '*' for global
  metric_type TEXT NOT NULL,
  operator TEXT NOT NULL,               -- 'gt', 'lt', 'eq'
  threshold_value REAL NOT NULL,
  severity TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  email_address TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Daily aggregated stats (for cost tracking)
CREATE TABLE daily_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                   -- 'YYYY-MM-DD'
  service_name TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  total_d1_reads INTEGER DEFAULT 0,
  total_d1_writes INTEGER DEFAULT 0,
  total_r2_reads INTEGER DEFAULT 0,
  total_r2_writes INTEGER DEFAULT 0,
  total_kv_reads INTEGER DEFAULT 0,
  total_kv_writes INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,
  UNIQUE(date, service_name)
);

CREATE INDEX idx_daily_date ON daily_aggregates(date DESC);
```

---

## Services to Monitor

### Workers (9)

> **Standard:** All HTTP-accessible workers MUST expose `/health` endpoint returning `{ status: "ok" }` with 200 status code.

| Service | Endpoint | Health Check Path | Notes |
|---------|----------|-------------------|-------|
| groveauth | auth.grove.place | /health | ✅ Standard |
| scout | scout.grove.place | /health | ✅ Standard |
| grove-domain-tool | domains.grove.place | /health | ✅ Standard |
| autumnsgrove | autumnsgrove.dev | /health | ⚠️ Needs `/health` endpoint |
| autumnsgrove-daily-summary | (cron only) | — | Cron worker, no HTTP |
| autumnsgrove-sync-posts | (cron only) | — | Cron worker, no HTTP |
| library-enhancer-api | (API) | /health | ✅ Standard |
| grove-backup-worker | (cron only) | — | Cron worker, no HTTP |
| vista-collector | (cron only) | — | Cron worker, no HTTP |

**Action Required:** Add `/health` endpoint to `autumnsgrove` worker before Vista implementation.

### D1 Databases (9)

| Database | ID |
|----------|-----|
| groveauth | 45eae4c7-8ae7-4078-9218-8e1677a4360f |
| scout-db | 6a289378-c662-4c6a-9f1b-fa5296e03fa2 |
| grove-engine-db | a6394da2-b7a6-48ce-b7fe-b1eb3e730e68 |
| grovemusic-db | e1e31ed2-3b1f-4dbd-9435-c9105dadcfa2 |
| library-enhancer-db | afd1ce4c-618a-430a-bf0f-0a57647a388d |
| autumnsgrove-posts | 510badf3-457a-4892-bf2a-45d4bfd7a7bb |
| autumnsgrove-git-stats | 0ca4036f-93f7-4c8a-98a5-5353263acd44 |
| grove-domain-jobs | cd493112-a901-4f6d-aadf-a5ca78929557 |
| your-site-posts | 86342742-7d34-486f-97f0-928136555e1a |

### R2 Buckets (6)

| Bucket | Purpose |
|--------|---------|
| grove-cdn | CDN assets |
| grove-media | User uploads |
| scout-results | Search cache |
| grovemusic-storage | Audio files |
| autumnsgrove-images | Blog images |
| library-enhancer-images | Library assets |

### KV Namespaces (7)

| Namespace | ID |
|-----------|-----|
| SCOUT_CACHE | 31eb5622c7fd41ec8fc8c8f939f5099b |
| SESSIONS | 46c5fb1dd2d04385a7e624b2e4730ad6 |
| grove-cache | 514e91e81cc44d128a82ec6f668303e4 |
| CONFIG | 6488be12cf90402caf6ced7bf156ad6c |
| CACHE | 677a09cfeb5c4afe9bac24240c1fcc6d |
| autumnsgrove-CACHE_KV | 6bc72b16c721401e8b9a848a7ae4e0ca |
| RATE_LIMITS | d5c976093f344aba948f77f37d29194a |

---

## Metrics to Collect

### Per Worker (from CF Analytics API)
- `requests_total` - Total requests
- `requests_success` - 2xx responses
- `requests_error` - 4xx/5xx responses
- `error_rate` - Percentage of errors
- `latency_p50` - 50th percentile latency
- `latency_p95` - 95th percentile latency
- `latency_p99` - 99th percentile latency
- `cpu_time_avg` - Average CPU time per request
- `duration_avg` - Average wall-clock time

### Per D1 Database
- `size_bytes` - Database file size
- `rows_read` - Total rows read
- `rows_written` - Total rows written
- `query_count` - Number of queries

### Per R2 Bucket
- `object_count` - Number of objects
- `total_size_bytes` - Total storage used
- `class_a_ops` - PUT/POST/LIST operations
- `class_b_ops` - GET operations

### Per KV Namespace
- `read_count` - Number of reads
- `write_count` - Number of writes
- `delete_count` - Number of deletes
- `list_count` - Number of list operations

### System-wide
- `total_cost_estimate_usd` - Estimated daily/monthly cost
- `uptime_percentage` - Overall platform uptime
- `active_incidents` - Current open incidents

---

## Alerting Configuration

### Default Thresholds

```typescript
const DEFAULT_THRESHOLDS = [
  // Error rate alerts (percentage)
  { metric: 'error_rate', operator: 'gt', value: 5, severity: 'warning' },
  { metric: 'error_rate', operator: 'gt', value: 10, severity: 'critical' },

  // Latency alerts (milliseconds)
  { metric: 'latency_p95', operator: 'gt', value: 500, severity: 'warning' },
  { metric: 'latency_p95', operator: 'gt', value: 1000, severity: 'critical' },

  // Health check alerts
  { metric: 'health_check', operator: 'eq', value: 0, severity: 'critical' },

  // D1 size alerts (approaching 10GB limit)
  { metric: 'd1_size_bytes', operator: 'gt', value: 8_000_000_000, severity: 'warning' },
  { metric: 'd1_size_bytes', operator: 'gt', value: 9_500_000_000, severity: 'critical' },

  // Cost alerts - based on realistic infrastructure costs
  // With 9 workers, 9 DBs, 6 R2 buckets, 7 KV namespaces
  { metric: 'daily_cost_usd', operator: 'gt', value: 15, severity: 'warning' },
  { metric: 'daily_cost_usd', operator: 'gt', value: 25, severity: 'critical' },

  // Cost spike alerts - percentage increase from 7-day rolling average
  { metric: 'cost_increase_pct', operator: 'gt', value: 50, severity: 'warning' },
  { metric: 'cost_increase_pct', operator: 'gt', value: 100, severity: 'critical' },
];
```

**Cost Threshold Rationale:** With 9+ workers, 9 D1 databases, 6 R2 buckets, and 7 KV namespaces, baseline costs will be higher than a simple app. The $15/$25 thresholds account for normal production workloads. The percentage-based spike detection catches anomalies even if baseline costs are within thresholds.

### Email Alert Payload (via Resend)

```typescript
interface AlertEmailPayload {
  severity: 'critical' | 'warning' | 'info';
  service: string;
  metric: string;
  currentValue: number;
  threshold: number;
  title: string;
  description: string;
  timestamp: string;
  dashboardUrl: string;
}
```

---

## Dashboard UI Pages

### 1. Overview (`/`)
- **Hero Stats**: Total services, healthy/degraded/down counts
- **Service Grid**: Card per service with status badge, sparkline, key metric
- **Active Incidents**: List of unresolved alerts
- **24h Summary**: Requests, errors, cost estimate
- **Quick Actions**: Links to each service's detail page

### 2. Workers (`/workers`)
- **Table View**: All workers with sortable columns
- **Per-Worker Detail** (`/workers/[name]`):
  - Request volume chart (24h, 7d, 30d toggles)
  - Error rate chart
  - Latency distribution
  - Recent errors log
  - CPU time breakdown

### 3. Databases (`/databases`)
- **D1 Overview**: All databases with size, read/write counts
- **Per-Database Detail** (`/databases/[name]`):
  - Size over time
  - Read/write trends
  - Query patterns

### 4. Storage (`/storage`)
- **R2 Buckets**: Object count, size, operations
- **KV Namespaces**: Read/write patterns
- **Combined storage cost estimate**

### 5. Health (`/health`)
- **Uptime Grid**: 90-day uptime per service (GitHub-style grid)
- **Response Time History**: Line chart per endpoint
- **Recent Incidents**: Timeline view

### 6. Alerts (`/alerts`)
- **Active Alerts**: Current incidents
- **Alert History**: Past alerts with resolution time
- **Configuration**: Threshold management UI
- **Email Setup**: Alert email address config

### 7. Costs (`/costs`)
- **Daily Cost Breakdown**: Stacked bar chart by resource type
- **Monthly Projection**: Based on current usage
- **Per-Service Costs**: Which services cost the most
- **Optimization Tips**: Suggestions based on usage patterns

---

## Data Retention & Storage Strategy

### Storage Architecture

| Data Type | Storage | Retention | Purpose |
|-----------|---------|-----------|---------|
| Time-series metrics | D1 | 90 days | Historical analysis, charts |
| Health check results | D1 | 90 days | Uptime calculations |
| Daily aggregates | D1 | 1 year | Cost tracking, trends |
| Real-time snapshots | KV | 10 min TTL | Dashboard current state |
| Active incidents | KV | Until resolved | Live alerts |
| Incident history | D1 | 1 year | Post-mortems |

### Data Volume Estimates

At 5-minute collection intervals across 25+ monitored resources:
- **~288 collections/day** × 25 resources × 10 metrics = ~72,000 rows/day
- **~2.16M rows/month** in `metrics` table
- **~26M rows/year** (before retention cleanup)

### Retention Jobs

The collector worker runs daily cleanup:

```typescript
// Daily retention cleanup (runs at 3am UTC)
async function cleanupOldData(db: D1Database) {
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

  // Delete old metrics (90 days)
  await db.prepare('DELETE FROM metrics WHERE recorded_at < ?').bind(ninetyDaysAgo).run();
  await db.prepare('DELETE FROM health_checks WHERE checked_at < ?').bind(ninetyDaysAgo).run();

  // Delete old aggregates (1 year)
  await db.prepare('DELETE FROM daily_aggregates WHERE date < ?').bind(oneYearAgo).run();
  await db.prepare('DELETE FROM incidents WHERE resolved_at < ?').bind(oneYearAgo).run();
}
```

### Performance Optimization

To meet the <2 second dashboard load target with 90 days of data:

1. **Pre-computed aggregates** — Daily rollups calculated at midnight
2. **KV caching** — Dashboard overview cached in KV with 5-min TTL
3. **Indexed queries** — All time-range queries use indexed columns
4. **Pagination** — Historical data paginated, not loaded all at once
5. **Sparkline sampling** — Charts sample every Nth point for long ranges

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [x] Set up monorepo structure
- [x] Define database migrations
- [x] Create wrangler.toml configurations
- [ ] Create D1 database `grove-monitor-db`
- [ ] Create KV namespace `MONITOR_KV`
- [ ] Register Vista as Heartwood OAuth client

### Phase 2: Data Collection
- [ ] Add `/health` endpoint to autumnsgrove worker
- [ ] Implement collector worker with health checks module
- [ ] Cloudflare Analytics API integration
- [ ] D1 metrics collection
- [ ] R2 metrics collection
- [ ] KV metrics collection
- [ ] Cron scheduling (every 5 min)
- [ ] Daily retention cleanup job

### Phase 3: Alerting
- [ ] Threshold configuration
- [ ] Resend email integration
- [ ] Alert history tracking
- [ ] Incident management
- [ ] Cost spike detection (percentage-based)

### Phase 4: API Layer
- [ ] Implement all API endpoints
- [ ] Add Heartwood session validation middleware
- [ ] Add caching with KV
- [ ] Historical data queries
- [ ] Cost calculation logic

### Phase 5: Dashboard UI
- [ ] Heartwood OAuth callback handler
- [ ] Auth redirect flow (hooks.server.ts)
- [ ] Overview page with service grid
- [ ] Workers detail pages
- [ ] Databases page
- [ ] Storage page
- [ ] Charts and visualizations

### Phase 6: Polish
- [ ] Cost tracking page
- [ ] Health/uptime page (90-day grid)
- [ ] Mobile responsive design
- [ ] Performance optimization (KV caching, pagination)
- [ ] Documentation

---

## Success Metrics

- Dashboard loads in < 2 seconds
- Metrics collected every 5 minutes without gaps
- Alerts delivered within 1 minute of threshold breach
- 99.9% uptime for Vista itself
- All historical data queryable for 90 days

---

## DNS Setup

```
vista.grove.place  CNAME  grove-monitor.pages.dev
```

---

## Marketing & Acquisition Analytics

In addition to infrastructure monitoring, Vista tracks marketing effectiveness and user acquisition metrics. This helps understand how users find Grove and which channels drive signups.

### Acquisition Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| QR code scans | `/hello` page visits with `?ref=card` | Track business card effectiveness |
| Landing page visits | grove.place pageviews | Overall awareness |
| Signup funnel | grove.place → plant.grove.place → checkout | Conversion tracking |
| Email signups | `/api/signup` calls | Waitlist growth |
| Referral source | `?ref=` or `utm_source` params | Channel attribution |

### Implementation

#### 1. Referrer Tracking

Add `ref` parameter support to key landing pages:

```typescript
// Track referrer on /hello page load
// grove.place/hello?ref=card-front or ?ref=card-back
const ref = url.searchParams.get('ref') || 'direct';

// Log to Vista
await fetch('https://vista-api.grove.place/track/acquisition', {
  method: 'POST',
  body: JSON.stringify({
    event: 'page_visit',
    page: '/hello',
    ref,
    timestamp: Date.now()
  })
});
```

#### 2. Business Card QR Tracking

QR codes encode URLs with tracking parameters:
- **Front QR:** `grove.place?ref=card-front`
- **Back QR:** `grove.place/hello?ref=card-back`

This allows comparing which side of the card drives more engagement.

#### 3. Signup Funnel

Track the full funnel:
1. `landing_visit` — User lands on grove.place
2. `hello_visit` — User visits /hello (likely from card)
3. `email_signup` — User joins waitlist
4. `plant_visit` — User visits plant.grove.place
5. `checkout_start` — User begins checkout
6. `checkout_complete` — User completes payment

#### 4. Database Schema Addition

```sql
-- migrations/003_acquisition_tracking.sql

-- Acquisition events (marketing analytics)
CREATE TABLE acquisition_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,           -- 'page_visit', 'email_signup', 'checkout_start', etc.
  page TEXT,                          -- '/hello', '/pricing', etc.
  referrer TEXT,                      -- 'card-front', 'card-back', 'hacker-news', 'twitter', etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  visitor_hash TEXT,                  -- Privacy-safe daily rotating hash
  recorded_at INTEGER NOT NULL
);

CREATE INDEX idx_acquisition_type_time ON acquisition_events(event_type, recorded_at DESC);
CREATE INDEX idx_acquisition_referrer ON acquisition_events(referrer, recorded_at DESC);

-- Daily acquisition aggregates
CREATE TABLE acquisition_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                 -- 'YYYY-MM-DD'
  referrer TEXT NOT NULL,
  page_visits INTEGER DEFAULT 0,
  email_signups INTEGER DEFAULT 0,
  checkout_starts INTEGER DEFAULT 0,
  checkout_completes INTEGER DEFAULT 0,
  conversion_rate REAL,               -- signups / visits
  UNIQUE(date, referrer)
);

CREATE INDEX idx_acquisition_daily_date ON acquisition_daily(date DESC);
```

### Dashboard UI: Acquisition (`/acquisition`)

New page in Vista dashboard:

- **Funnel Visualization** — Landing → Email → Plant → Checkout → Paid
- **Referrer Breakdown** — Bar chart showing which sources drive traffic
- **QR Code Effectiveness** — Card-front vs card-back comparison
- **Conversion Rates** — By source and over time
- **Daily/Weekly/Monthly Trends** — Line charts for each metric

### Privacy Considerations

- No PII stored (email addresses tracked as counts, not values)
- Visitor hash rotates daily (can't track individuals across days)
- Aggregates kept for 1 year, raw events for 90 days
- No third-party analytics (all internal)

### Implementation Phase

Add to **Phase 7: Marketing Analytics** (after Phase 6: Polish):

- [ ] Add `acquisition_events` and `acquisition_daily` tables
- [ ] Create `/track/acquisition` API endpoint
- [ ] Add referrer tracking to landing pages (`grove.place`, `/hello`)
- [ ] Implement funnel tracking middleware
- [ ] Build `/acquisition` dashboard page
- [ ] Add QR code comparison widget
- [ ] Document UTM parameter conventions

---

## Related Resources

- [Cloudflare Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)
- [D1 HTTP API](https://developers.cloudflare.com/api/operations/cloudflare-d1-list-databases)
- [R2 API](https://developers.cloudflare.com/r2/api/workers/)
- [Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Resend API](https://resend.com/docs/api-reference/introduction)

---

*Where you go to see everything clearly.*
