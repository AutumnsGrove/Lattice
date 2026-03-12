---
title: "Patina Developer Guide"
description: "How to operate, extend, and troubleshoot Grove's automated D1 backup system."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - patina
  - backups
  - cold-storage
  - recovery
---

# Patina Developer Guide

How to operate, extend, and troubleshoot Patina, the automated backup system that dumps all 14 Grove D1 databases to R2 cold storage on a schedule.

## How It Works

Patina is a Cloudflare Worker (`workers/patina/`) running two cron triggers. Every day at 3:00 AM UTC, it backs up the three priority databases (groveauth, grove-engine-db, grove-curios-db). Every Sunday at 4:00 AM UTC, it backs up all 14 databases. Both schedules run the same core logic with different database lists.

The backup flow for each database:

1. Query `sqlite_master` for all user tables (excluding `_cf%` and `sqlite%` internal tables)
2. For each table, export the `CREATE TABLE` DDL and all rows as `INSERT` statements, batched in groups of 1,000
3. Wrap everything in a transaction (`BEGIN TRANSACTION` / `COMMIT`) with `PRAGMA foreign_keys=OFF`
4. Upload the resulting `.sql` file to R2 at the key `YYYY-MM-DD/database-name.sql`
5. Record the backup in the `backup_inventory` table of the metadata database
6. After all databases finish, run cleanup to delete any backups past their expiration date
7. Send an email alert through Zephyr if configured

Every backup gets a UUID job ID. The metadata database (`grove-backups-db`) tracks job-level status in `backup_jobs` and per-database results in `backup_results`. The `backup_inventory` table is the source of truth for what exists in R2.

### Retention

Backups expire after 12 weeks by default (configurable via the `RETENTION_WEEKS` environment variable). The expiration timestamp is calculated at write time and stored in `backup_inventory.expires_at`. Cleanup runs at the end of every backup job, queries for rows where `expires_at < now` and `deleted_at IS NULL`, deletes the R2 object, then soft-deletes the inventory row by setting `deleted_at`.

### Daily vs. Weekly

The scheduled handler checks `event.cron` against the constant `CRON_DAILY` (`"0 3 * * *"`). If it matches, only databases with `dailyBackup: true` in `databases.ts` are backed up. Any other cron pattern (including the Sunday `"0 4 * * SUN"` trigger and manual triggers) backs up all 14 databases.

On Sundays, both crons fire. The daily runs first at 3 AM, the weekly at 4 AM. The inventory table uses `INSERT OR IGNORE` on the unique `r2_key` column, so if the daily already created a backup for that date, the weekly silently skips the duplicate inventory record. The R2 `put` overwrites the file, which is fine since the content is identical.

### Authentication

Protected endpoints require a Bearer token in the `Authorization` header. The token is compared against the `API_KEY` secret using constant-time comparison (XOR-based, not timing-safe crypto). If `API_KEY` isn't configured at all, protected endpoints return 503 with setup instructions.

Public endpoints: `GET /` (documentation JSON) and `GET /health`.

### Alerting

Patina sends email alerts through the Zephyr email gateway. Two environment flags control when alerts fire: `ALERT_ON_FAILURE` (default `"true"`) and `ALERT_ON_SUCCESS` (default `"false"`). The alert includes a formatted HTML email with job summary, duration, total size, and a table of any failed databases. If `ZEPHYR_API_KEY` or `ZEPHYR_URL` aren't set, alerting silently skips.

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Returns JSON documentation with endpoint list, schedule info, database count |
| GET | `/health` | Three-check health probe: worker alive, metadata DB responsive, R2 bucket accessible. Returns `"healthy"`, `"degraded"`, or `"unhealthy"` |

### Protected (require `Authorization: Bearer <API_KEY>`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Current backup state (idle/running), last completed job, next scheduled time, 10 most recent jobs, storage stats |
| GET | `/list` | Paginated backup inventory. Supports `?database=`, `?date=`, `?limit=` (max 100), `?offset=` |
| POST | `/trigger` | Manually start a full backup. Accepts optional `{ "databases": ["groveauth"] }` to scope. Returns immediately, runs async via `waitUntil` |
| GET | `/download/:date/:db` | Download a `.sql` backup file from R2. Date format is `YYYY-MM-DD`, db is the database name |
| GET | `/restore-guide/:db` | Returns restore instructions for a specific database, including available backups and step-by-step wrangler commands |

## Adding a New Database

When a new D1 database is added to the Grove infrastructure, Patina needs three changes.

### 1. Add the wrangler binding

In `workers/patina/wrangler.toml`, add a new `[[d1_databases]]` block:

```toml
[[d1_databases]]
binding = "NEW_DB"
database_name = "new-db"
database_id = "your-database-uuid"
```

### 2. Update the Env type

In `src/types.ts`, add the binding to the `Env` interface and to the `DatabaseConfig.binding` union:

```typescript
export interface Env {
  // ... existing bindings
  NEW_DB: D1Database;
}
```

Add `"NEW_DB"` to the `Pick` union in `DatabaseConfig.binding`.

### 3. Register in the database list

In `src/lib/databases.ts`, add an entry to the `DATABASES` array:

```typescript
{
  name: "new-db",
  id: "your-database-uuid",
  binding: "NEW_DB",
  description: "What this database stores",
  priority: "normal",  // "critical" | "high" | "normal"
  estimatedSize: "~50 KB",
  dailyBackup: false,  // set true for priority daily backups
},
```

If you set `dailyBackup: true`, the database will be included in the 3 AM daily run. The `DAILY_DATABASES` list is derived automatically by filtering on this flag.

Deploy with `wrangler deploy` from `workers/patina/`.

## Modifying the Backup Format

The SQL export logic lives in `src/lib/exporter.ts`. The `exportDatabase` function produces a self-contained SQL dump. If you need to change the format:

- Table discovery: `getUserTables()` queries `sqlite_master`. It already excludes Cloudflare internals (`_cf%`) and SQLite system tables. If D1 introduces new internal table prefixes, add them here.
- Row export: `exportTableRows()` iterates in batches of 1,000 (`BATCH_SIZE` constant). Each row becomes an `INSERT INTO` statement. Binary data (`Uint8Array`) is encoded as hex literals (`X'...'`). Strings have single quotes escaped.
- The dump disables foreign keys during restore (`PRAGMA foreign_keys=OFF/ON`) and wraps everything in a transaction.

The export runs synchronously per database, one database at a time. There's a `concurrency: 3` config in `BACKUP_CONFIG` but the actual implementation processes databases sequentially in a `for` loop.

## Why It Breaks

### Backup job shows "failed" but individual databases succeeded

The job-level catch block in `handleScheduled` catches errors from cleanup or alert sending, not only from database exports. If cleanup fails (R2 permission issue, metadata DB unreachable), the whole job is marked `"failed"` via `failJobRecord()` even though all 14 database exports completed and uploaded to R2.

Check `backup_results` for the specific job ID to see per-database outcomes.

### Sunday produces duplicate or missing backups

Both crons fire on Sunday. If the daily 3 AM run is still going when the weekly 4 AM run starts, they run concurrently. There's no mutex. The `INSERT OR IGNORE` on `backup_inventory` prevents duplicate metadata rows, and R2 `put` is idempotent, so data integrity holds. But the metadata database might show two `backup_jobs` rows for the same Sunday, one from daily and one from weekly.

The spec describes a check for running jobs before starting the weekly backup, but the implementation does not have this guard. Both will run.

### Health endpoint returns "degraded"

The `/health` endpoint checks three things independently: worker (always `true`), metadata DB (`SELECT 1`), and R2 bucket (`list` with limit 1). If either the DB or R2 check throws, that check fails and the status drops to `"degraded"` (HTTP 200, not 503). Only if all three fail does it return `"unhealthy"` (HTTP 503).

A degraded status usually means a transient Cloudflare issue. If it persists, check the D1 database status in the Cloudflare dashboard.

### Manual trigger doesn't back up specific databases

The `POST /trigger` endpoint accepts a `databases` array in the request body and filters the `DATABASES` list accordingly. But it then calls `handleScheduled` with a fake `ScheduledEvent` where `cron` is `"manual"`. Inside `handleScheduled`, `getDatabasesToBackup` ignores the body entirely and returns all databases (since `"manual"` doesn't match `CRON_DAILY`). The filtering in `triggerHandler` is dead code.

To actually back up specific databases via manual trigger, you'd need to modify `handleScheduled` to accept a database list parameter.

### Alert emails aren't arriving

Check in order: `ZEPHYR_API_KEY` is set as a wrangler secret, `ZEPHYR_URL` is correct in `wrangler.toml` vars, `ALERT_EMAIL` is set, and `ALERT_ON_FAILURE` is `"true"`. The alerting code catches its own errors and logs them, so a Zephyr outage won't crash the backup job.

### Export fails on large tables

The exporter builds the entire SQL dump as a string array in memory, then joins it. For databases with large tables (many thousands of rows or large text/blob columns), this could hit the Worker memory limit (128 MB). The `BATCH_SIZE` of 1,000 rows controls how many rows are fetched per D1 query, but all rows still accumulate in the `lines` array before upload.

If a database grows large enough to cause memory pressure, the export will need to switch to streaming writes to R2 using multipart upload.

## Architecture Notes

### The metadata database is separate from the source databases

Patina's own tracking lives in `grove-backups-db` (bound as `METADATA_DB`), completely separate from the 14 databases it backs up. This means Patina can track backup history even if a source database goes down. The metadata DB itself is not backed up by Patina (that would be circular), so rely on D1 Time Travel for the metadata DB if needed.

### R2 key structure

Backups are stored flat: `YYYY-MM-DD/database-name.sql`. There's no `/daily/` or `/weekly/` prefix separation despite the spec describing one. The spec also describes weekly tar.gz compression of daily backups, but this isn't implemented. There's no `weekly.ts` or `compressor.ts` in the source. Each backup is a standalone `.sql` file.

### SQL format, not binary

The dumps are plain SQL text, human-readable and portable. You can pipe them directly into any SQLite-compatible tool. The tradeoff is size (no compression) and speed (text serialization of every row). For Grove's current database sizes (all under 1 MB), this is fine.

### No encryption at rest

Backup files in R2 are plain SQL. R2 provides server-side encryption by default, but anyone with R2 bucket access can read the backups. The `API_KEY` protects the HTTP endpoints, not the R2 objects themselves.

### Worker name mismatch

The `wrangler.toml` sets `name = "grove-backups"` and the `package.json` uses `name: "grove-patina"`. The deployed worker name is `grove-backups`. The hardcoded download URLs in `list.ts` and `restore-guide.ts` reference `grove-backups.m7jv4v7npb.workers.dev`.

## Key Files

| File | What it does |
|------|-------------|
| `workers/patina/src/index.ts` | Hono app, route registration, fetch/scheduled exports |
| `workers/patina/src/scheduled.ts` | Core backup orchestration: job lifecycle, per-DB export, cleanup, alerting |
| `workers/patina/src/types.ts` | All TypeScript interfaces (Env, BackupJob, BackupResult, API responses) |
| `workers/patina/src/lib/databases.ts` | Registry of all 14 databases with priority, binding, and daily flag |
| `workers/patina/src/lib/exporter.ts` | D1 to SQL dump conversion (schema + data) |
| `workers/patina/src/lib/cleanup.ts` | Expired backup deletion from R2 and metadata DB |
| `workers/patina/src/lib/alerting.ts` | Zephyr email notifications with HTML formatting |
| `workers/patina/src/lib/utils.ts` | SQL value formatting, byte formatting, UUID generation, timestamps |
| `workers/patina/src/middleware/auth.ts` | Bearer token validation with constant-time comparison |
| `workers/patina/src/routes/health.ts` | Three-probe health check (worker, DB, R2) |
| `workers/patina/src/routes/status.ts` | Backup status, recent jobs, storage statistics |
| `workers/patina/src/routes/list.ts` | Paginated backup inventory with filtering |
| `workers/patina/src/routes/trigger.ts` | Manual backup trigger via `waitUntil` |
| `workers/patina/src/routes/download.ts` | R2 file download as `.sql` attachment |
| `workers/patina/src/routes/restore-guide.ts` | Per-database restore instructions (wrangler CLI + D1 Time Travel) |
| `workers/patina/migrations/001_backup_metadata.sql` | Metadata schema: backup_jobs, backup_results, backup_inventory, alert_config |
| `workers/patina/wrangler.toml` | Worker config, cron triggers, D1/R2 bindings, env vars |
| `docs/specs/patina-spec.md` | Original spec (note: several spec features like weekly compression are not yet implemented) |

## Restoring a Database

Two methods, depending on how far back you need to go.

**For the last 30 days**, use D1 Time Travel. It's faster and doesn't require downloading anything:

```bash
wrangler d1 time-travel info <database-name>
wrangler d1 time-travel restore <database-name> --timestamp="2026-03-01T03:00:00Z"
```

**For older restores** (up to 12 weeks), use a Patina backup:

```bash
# Download the backup
curl -H "Authorization: Bearer YOUR_KEY" \
  -o backup.sql \
  https://grove-backups.m7jv4v7npb.workers.dev/download/2026-02-15/groveauth

# Review it first
head -50 backup.sql

# Restore (this drops and recreates all tables)
wrangler d1 execute <database-name> --file=backup.sql
```

The `/restore-guide/:db` endpoint generates these instructions with the correct database name and latest backup date pre-filled.

## Quick Checklist

Adding a new database to Patina?

- [ ] D1 binding added to `wrangler.toml`
- [ ] Binding type added to `Env` interface in `types.ts`
- [ ] Binding name added to `DatabaseConfig.binding` union in `types.ts`
- [ ] Database entry added to `DATABASES` array in `databases.ts`
- [ ] `dailyBackup` flag set appropriately
- [ ] Deploy with `wrangler deploy` from `workers/patina/`
- [ ] Verify next backup run includes the new database via `GET /status`

Debugging a failed backup?

- [ ] Check `GET /status` for overall job state
- [ ] Check `GET /list?database=<name>` for that database's backup history
- [ ] Check `GET /health` for infrastructure issues (DB connectivity, R2 access)
- [ ] Check Cloudflare dashboard for Worker logs (the job ID appears in every log line)
- [ ] If alert email missing, verify `ZEPHYR_API_KEY` secret and `ALERT_ON_FAILURE` env var
