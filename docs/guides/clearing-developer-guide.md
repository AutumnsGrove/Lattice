---
title: "Clearing Developer Guide"
description: "Public status page and automated health monitoring for the Grove platform."
category: guides
guideCategory: operations
lastUpdated: "2026-03-12"
aliases: []
tags:
  - clearing
  - status-page
  - incidents
  - monitoring
---

# Clearing Developer Guide

Clearing is Grove's public status page, deployed at `status.grove.place`. It shows Wanderers whether the platform is healthy, tracks incidents with a full timeline, runs automated health checks every five minutes, and publishes an RSS feed. The name comes from the idea of an open space in the forest where you can see clearly.

This guide covers how the monitoring system works, how the status page renders data, and how to extend both.

## How It Works

Clearing runs as a single Cloudflare Worker. It handles two responsibilities: serving the SvelteKit status page (via `fetch()`) and running health monitoring (via `scheduled()` cron triggers). These were previously separate deployments, now unified.

### The Worker Entry Point

The build pipeline produces two files in `.svelte-kit/cloudflare/`:

1. `_worker.js` is the SvelteKit adapter output (renamed from `_entry.js` during the build)
2. `_entry.js` is the custom entry point that imports `_worker.js` for `fetch()` and adds the `scheduled()` handler

The `scripts/build-entry.mjs` script runs after `vite build`. It renames the adapter's output, then uses esbuild to bundle the monitor code into the custom entry. The `_worker.js` import is marked as `external` so esbuild does not re-bundle SvelteKit's output.

The `wrangler.toml` sets `main = ".svelte-kit/cloudflare/_entry.js"` and defines two cron triggers:

- `*/5 * * * *` runs health checks for all components every 5 minutes
- `0 0 * * *` runs daily history aggregation at midnight UTC

### Health Check Flow

Every 5 minutes, the cron trigger calls `runHealthChecks()`. The flow:

1. `checkAllComponents()` fetches health endpoints for all configured components in parallel
2. Each result is classified by HTTP status, JSON health payload (for deep checks), and response latency
3. `processAllResults()` feeds each result through the incident state machine
4. KV state is updated, D1 component statuses are updated if thresholds are met

Two check types exist:

| Check Type | How It Works | Components |
|---|---|---|
| **Deep** | Expects JSON with a `status` field (`healthy`, `degraded`, `unhealthy`, `maintenance`). Latency can only downgrade a healthy service to "degraded", never to an outage. | Blog Engine, Authentication, Payments, API |
| **Shallow** | Verifies HTTP 2xx. Latency thresholds apply fully since there is no self-reported status. | CDN |

Latency thresholds are intentionally generous. Worker-to-worker calls within Cloudflare naturally take 400-800ms cross-region, so:

- `< 2000ms` = operational
- `>= 2000ms` = degraded
- `>= 5000ms` = partial outage (shallow checks only; deep checks cap at degraded)

### The Incident State Machine

Each component tracks its own state in KV under the key `monitor:{componentId}`. The state includes consecutive failure count, consecutive success count, active incident ID, and last known status.

Three thresholds control transitions:

| Threshold | Value | What It Does |
|---|---|---|
| `CHECKS_TO_DEGRADE` | 2 | Consecutive non-operational checks before the component status updates in D1 |
| `FAILURES_TO_CREATE` | 3 | Consecutive failures before an incident is auto-created |
| `SUCCESSES_TO_RESOLVE` | 2 | Consecutive healthy checks before an active incident resolves |

This debouncing prevents a single slow check from changing visible status. A component must fail twice before Wanderers see "degraded" on the page, and three times before the system creates an incident.

When an incident is created, the manager inserts into `status_incidents`, links the affected component via `status_incident_components`, and adds an initial update to `status_updates`. When resolved, it sets `resolved_at` and adds a resolution update. Both paths fire email alerts via the Zephyr gateway (if configured). Emails are fire-and-forget; a failed email never blocks the monitoring pipeline.

Maintenance is a special case. If a deep health check returns `{ "status": "maintenance" }`, the component status updates to maintenance and no incident is created.

### Daily History

The midnight cron trigger calls `recordDailyHistory()`, which does two things for each component:

1. Counts incidents that overlapped with the previous day (using the `started_at` / `resolved_at` window)
2. Writes or updates a row in `status_daily_history` with the incident count

Real-time worst-status tracking also happens during health checks. `updateTodayWorstStatus()` runs after each non-operational check result and writes the worst status seen so far today. It uses `INSERT ... ON CONFLICT ... DO UPDATE` with a priority comparison, so it only writes when the status is worse than what is already recorded. Operational checks skip the write entirely to avoid 288 unnecessary writes per day per component.

After recording history, `cleanupOldHistory()` deletes rows older than 90 days.

### Database Schema

All tables live in the shared `grove-engine-db` D1 database, prefixed with `status_`:

| Table | Purpose |
|---|---|
| `status_components` | Platform components with current status (seeded with 6 components, though only 5 are actively monitored in `config.ts` (Meadow is in the DB seed but absent from the `COMPONENTS` array)) |
| `status_incidents` | Incident records with lifecycle state, impact, and type |
| `status_updates` | Timeline updates attached to incidents |
| `status_incident_components` | Junction table linking incidents to affected components |
| `status_scheduled` | Scheduled maintenance windows (components stored as JSON array) |
| `status_daily_history` | Daily worst-status records for 90-day uptime visualization |

The migration is at `apps/clearing/migrations/0001_status_tables.sql`. Component IDs in the migration match the IDs in `monitor/config.ts`, which is important because the health check system writes directly to `status_components` by ID.

A second database binding, `BACKUPS_DB` (`grove-backups-db`), provides read access to the backup inventory for the Data Protection section.

### Uptime Calculation

The uptime percentage shown on each component's 90-day bar uses weighted scoring:

| Status | Weight |
|---|---|
| operational | 1.0 (100%) |
| degraded | 0.75 (75%) |
| partial_outage | 0.25 (25%) |
| major_outage | 0 (0%) |
| maintenance | 1.0 (does not count against uptime) |

Days with no `status_daily_history` record default to operational. The formula is `(sum of daily weights / 90) * 100`.

### Overall Status Derivation

The banner status is computed from component statuses using `calculateOverallStatus()`. It checks in priority order: major outage, partial outage, degraded. Maintenance is excluded from this calculation. A single component in scheduled maintenance does not change the banner when everything else is operational. Only when every component is in maintenance does the banner show "Under Maintenance".

## The Status Page

### Page Load

The `+page.server.ts` load function fetches everything in parallel:

- Components and their current status
- Recent incidents (last 30 days) with all updates and linked components (batch query)
- Scheduled maintenance
- 90-day uptime history for all components
- Backup status from the `BACKUPS_DB` database (with 6-hour cache via Cloudflare Cache API)
- Channel messages from the main Grove database

If D1 is unavailable (local dev or database error), all functions fall back to mock data and the page renders with a demo-data warning banner.

The batch query for incidents (`getRecentIncidentsWithUpdates`) avoids N+1 queries. It fetches all incidents in the date range, then batch-fetches all their updates and component relationships using `IN (...)` clauses with parameterized UUIDs. The UUIDs are validated against a regex before use.

### Components

Six Svelte components make up the UI:

| Component | What It Renders |
|---|---|
| `GlassStatusBanner` | Hero banner with overall platform status, icon, description, and relative "last updated" time |
| `GlassStatusCard` | Individual component card showing name, description, and status pill with icon |
| `GlassUptimeBar` | 90-day horizontal bar chart. Each day is a colored sliver. Hover shows a tooltip with date, status, and incident count. Keyboard accessible. |
| `GlassBackupStatus` | Data protection section with backup count, storage used, reliability score, and daily history |
| `IncidentCard` | Expandable card with incident header, affected components, timeline of updates, and a link to the full report |
| `ScheduledMaintenanceCard` | Upcoming maintenance with date/time range and affected components. Shows "Coming Soon" if within 24 hours. |

The main page (`+page.svelte`) shows sections in this order: channel messages, GroveIntro, status banner, active incidents (if any), scheduled maintenance (if any), system status grid (first 4 components, expandable), data protection, 90-day uptime (first 3 components, expandable), past incidents grouped by date.

### Incident Detail Page

`/incidents/[slug]` loads a single incident by slug with full timeline. The slug is validated against `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (max 100 chars) before any database query. The page shows a header card with start time, resolution time, duration, impact, and affected components, followed by a vertical timeline with status-specific icons (Search for investigating, Eye for identified, Clock for monitoring, CheckCircle for resolved).

## API Endpoints

### `GET /api/status`

Public JSON endpoint returning current platform status. Used by the engine's `GlassStatusWidget` and external integrations. Response includes overall status, component list, active incidents, and scheduled maintenance. Cached for 60 seconds. CORS enabled.

### `GET /api/monitor`

Manual health check trigger. Runs the same checks as the cron trigger and returns results as JSON. Useful for debugging. Requires `DB` and `MONITOR_KV` bindings.

### `POST /api/monitor/daily`

Manual daily aggregation trigger. Runs the midnight aggregation job on demand. Useful for backfilling missed runs.

### `POST /api/sentinel`

Protected endpoint for the Sentinel stress testing system. Authenticated via `SENTINEL_API_KEY` bearer token. Accepts a `SentinelReport` with error rate, latency stats, and throughput. Maps error rates to component statuses:

- `> 50%` = major outage
- `> 20%` = partial outage
- `> 5%` = degraded

Can target a specific component by slug or update all infrastructure components (blog-engine, cdn, api). Optionally creates an incident if `createIncident` is true and the error rate exceeds 5%.

### `GET /feed`

RSS 2.0 feed of recent incidents. Each incident update becomes a separate RSS item with `[Status] Title` formatting. CDATA sections wrap title and description. Cached for 5 minutes.

## Adding a New Component

1. Add a row to `status_components` in the database (or add an `INSERT` to a new migration). Pick an ID that follows the `comp_` prefix pattern.

2. Add a `ComponentConfig` entry in `apps/clearing/src/lib/server/monitor/config.ts` with the component's health check URL and check type.

3. The component will automatically appear on the status page, in the uptime history, and in the monitoring pipeline.

Make sure the health endpoint returns JSON with a `status` field for deep checks, or a 200 response for shallow checks. The `User-Agent` header on health check requests is `Grove-Clearing-Monitor/1.0`.

## Modifying Incident Thresholds

All thresholds live in `apps/clearing/src/lib/server/monitor/config.ts` as named constants:

- `LATENCY_THRESHOLDS.OPERATIONAL` (2000ms) and `LATENCY_THRESHOLDS.SLOW` (5000ms)
- `INCIDENT_THRESHOLDS.CHECKS_TO_DEGRADE` (2), `FAILURES_TO_CREATE` (3), `SUCCESSES_TO_RESOLVE` (2)
- `REQUEST_TIMEOUT` (10000ms)

Changing these values takes effect on the next deployment. There is no hot-reload. Keep in mind that health checks run every 5 minutes, so `FAILURES_TO_CREATE = 3` means it takes 15 minutes of consecutive failures to auto-create an incident.

## Why It Breaks

**Health checks report false degradation.** Cloudflare worker-to-worker latency varies by region. If a lot of checks start hitting the 2000ms threshold, the issue is probably cross-region routing, not actual service degradation. The debounce thresholds exist specifically for this. If false positives persist, increase `LATENCY_THRESHOLDS.OPERATIONAL`.

**Incident never resolves automatically.** The `SUCCESSES_TO_RESOLVE` threshold requires 2 consecutive healthy checks (10 minutes). If the service is flapping, each failure resets the success counter. Check the KV state at `monitor:{componentId}` to see the current consecutive counts.

**Uptime bar shows 100% but there was an incident.** The daily history only records the worst status when a health check fires. If an incident was created and resolved between two 5-minute checks, the daily history might miss it. The midnight aggregation backfills from incident data as a safety net, but the gap between real-time checks and midnight aggregation can show stale data for the current day.

**Backup status shows stale data.** Backup status uses a 6-hour Cloudflare Cache API TTL. The cache key is `https://status.grove.place/api/backup-status`. If you need fresh data after a manual backup run, the cache will refresh on its own within 6 hours.

**`status_daily_history` grows indefinitely.** It does not. `cleanupOldHistory()` runs at midnight and deletes rows older than 90 days. If the cron trigger fails for an extended period, the table could accumulate stale data, but it is bounded by the number of components times the number of missed days.

**Sentinel creates incidents you did not expect.** The Sentinel endpoint only creates incidents when the `createIncident` field is explicitly `true` in the POST body. Verify the caller is not setting this flag unintentionally. Error rate thresholds for incident creation match the component degradation threshold (5%).

## Architecture Notes

### Why a Single Worker

Merging the status page and monitor into one worker eliminates a deployment coordination problem. The monitor needs D1 write access to the same tables the page reads from. With a single worker, they share bindings directly. Smart placement routes the worker closer to D1 for lower latency on both reads and writes.

### Why KV for Monitor State

The incident state machine needs fast reads and writes on every 5-minute cycle, and the data is ephemeral (it only matters for debounce logic). KV is a natural fit. State entries expire after 7 days in case the cron stops running, so stale state does not persist forever.

### Why Batch Queries

The status page could issue separate queries per incident for updates and components, but with 30 days of incidents that becomes dozens of round-trips to D1. The batch approach in `getRecentIncidentsWithUpdates` reduces this to 3 queries regardless of incident count: one for incidents, one for all updates, one for all component relationships. The trade-off is dynamic SQL (`IN (...)` with validated UUIDs), which is safe because the IDs come from a prior trusted query and are validated against a UUID regex.

### Build Pipeline

The build runs in two stages:

1. `vite build` produces the SvelteKit output in `.svelte-kit/cloudflare/`
2. `node scripts/build-entry.mjs` renames the adapter output and bundles the custom worker entry

The `package.json` build script chains these: `vite build && node scripts/build-entry.mjs`. Deployment runs `pnpm run build && wrangler deploy`.

## Key Files

| Path | Purpose |
|---|---|
| `apps/clearing/src/worker-entry.ts` | Custom worker entry with `scheduled()` handler |
| `apps/clearing/src/lib/server/monitor/config.ts` | Component definitions, thresholds, timeouts |
| `apps/clearing/src/lib/server/monitor/health-checks.ts` | Health check fetching and status classification |
| `apps/clearing/src/lib/server/monitor/incident-manager.ts` | Incident creation, resolution, KV state machine |
| `apps/clearing/src/lib/server/monitor/daily-history.ts` | Daily aggregation and cleanup |
| `apps/clearing/src/lib/server/status.ts` | D1 query functions for status page data |
| `apps/clearing/src/lib/server/backups.ts` | Backup status fetching with 6-hour cache |
| `apps/clearing/src/lib/types/status.ts` | Type definitions and status helper functions |
| `apps/clearing/src/routes/+page.server.ts` | Main page data loader with mock fallback |
| `apps/clearing/src/routes/api/sentinel/+server.ts` | Sentinel stress test reporting endpoint |
| `apps/clearing/src/routes/api/status/+server.ts` | Public JSON status API |
| `apps/clearing/src/routes/feed/+server.ts` | RSS 2.0 feed generator |
| `apps/clearing/scripts/build-entry.mjs` | Post-build esbuild script |
| `apps/clearing/wrangler.toml` | Worker config with cron triggers and bindings |
| `apps/clearing/migrations/0001_status_tables.sql` | Schema migration with seed data |

## Checklist

When working on Clearing, keep these in mind:

- [ ] Component IDs in `config.ts` must match the IDs in `status_components`. If you add a component to one, add it to the other.
- [ ] Deep health check endpoints must return JSON with a `status` field. If the format changes, update `evaluateDeepCheck()`.
- [ ] The `calculateOverallStatus()` function excludes maintenance from the priority check. If you add a new status level, update the function and the `STATUS_PRIORITY` map in `config.ts`.
- [ ] Mock data in `+page.server.ts` and the incident detail page must stay in sync with type definitions. If you add a field to `StatusComponent` or `StatusIncident`, add it to the mock objects too.
- [ ] RSS feed items use CDATA sections. Incident titles and update messages should not contain `]]>` (which would break CDATA). This is unlikely but worth knowing.
- [ ] The Sentinel endpoint does basic string comparison on the API key, not timing-safe comparison. For a status page this is acceptable, but worth noting if the threat model changes.
- [ ] Backup status queries run against `BACKUPS_DB`, a separate D1 database. If backup tables change schema, update `fetchBackupStatusFromDb()` in `backups.ts`.
