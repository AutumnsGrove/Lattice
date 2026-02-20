# Webhook Cleanup Worker Operations

> **Last Updated:** January 2026
> **Worker Name:** `grove-webhook-cleanup`
> **Schedule:** Daily at 3:00 AM UTC

This document covers deployment, monitoring, and troubleshooting for the webhook cleanup worker.

---

## Overview

The `grove-webhook-cleanup` worker is a scheduled Cloudflare Worker that automatically deletes expired webhook events from the D1 database. This enforces Grove's 120-day data retention policy.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare                            │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │  Cron Trigger   │───▶│  grove-webhook-cleanup      │ │
│  │  0 3 * * *      │    │  Worker                     │ │
│  └─────────────────┘    └──────────────┬──────────────┘ │
│                                        │                │
│                                        ▼                │
│                         ┌─────────────────────────────┐ │
│                         │  grove-engine-db (D1)       │ │
│                         │  webhook_events table       │ │
│                         └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Worker Location

```
workers/webhook-cleanup/
├── src/
│   └── index.ts      # Worker implementation
├── wrangler.toml     # Cloudflare configuration
├── tsconfig.json     # TypeScript config
└── package.json      # Dependencies
```

---

## Deployment

### Prerequisites

1. Cloudflare account with Workers access
2. D1 database `grove-engine-db` exists
3. Wrangler CLI authenticated (`wrangler login`)

### Deploy Command

```bash
cd workers/webhook-cleanup
wrangler deploy
```

### Verify Deployment

```bash
# Check worker is deployed
wrangler deployments list

# Check cron triggers are active
wrangler triggers list
```

### Environment-Specific Bindings

The `wrangler.toml` contains the production database binding:

```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
```

**For staging/development**, create environment-specific configurations:

```toml
[env.staging]
name = "grove-webhook-cleanup-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "grove-engine-db-staging"
database_id = "your-staging-db-id"
```

Deploy to staging:
```bash
wrangler deploy --env staging
```

---

## Manual Trigger

### Via HTTP (for testing)

The worker exposes an HTTP endpoint for manual cleanup:

```bash
# Trigger cleanup manually
curl https://grove-webhook-cleanup.<your-subdomain>.workers.dev/

# Response
{
  "success": true,
  "deleted": 150,
  "batches": 1,
  "message": "Deleted 150 expired webhook events"
}
```

### Via Wrangler

```bash
# Trigger the scheduled event locally
wrangler dev --test-scheduled

# In another terminal
curl "http://localhost:8787/__scheduled?cron=0+3+*+*+*"
```

---

## Monitoring

### Cloudflare Dashboard

1. Go to **Workers & Pages** → `grove-webhook-cleanup`
2. Check **Logs** tab for execution history
3. Check **Triggers** tab for cron schedule

### Expected Log Output

**Normal operation (records deleted):**
```
[Webhook Cleanup] Deleted 1523 expired events in 2 batch(es)
```

**Normal operation (nothing to delete):**
```
[Webhook Cleanup] No expired webhooks to clean up
```

**Error:**
```
[Webhook Cleanup] Failed: D1_ERROR: ...
```

### Alerts to Set Up

Consider setting up alerts for:

| Condition | Severity | Action |
|-----------|----------|--------|
| Worker execution fails | High | Check D1 database health |
| Unusually high deletion count (>10,000) | Medium | Verify retention policy working correctly |
| No executions in 48 hours | High | Check cron trigger status |

---

## Troubleshooting

### Worker Not Running

**Symptoms:** No logs, webhook_events table growing indefinitely

**Checks:**
```bash
# Verify cron trigger exists
wrangler triggers list

# Should show:
# Cron Triggers
# └── 0 3 * * * (daily at 3:00 AM UTC)
```

**Fix:** Redeploy the worker:
```bash
cd workers/webhook-cleanup
wrangler deploy
```

### Database Connection Errors

**Symptoms:** `D1_ERROR` in logs

**Checks:**
1. Verify database exists in Cloudflare dashboard
2. Verify `database_id` in `wrangler.toml` matches your D1 database
3. Check D1 service status on Cloudflare Status page

**Fix:** Update the `database_id` if it changed:
```toml
[[d1_databases]]
database_id = "correct-database-id-here"
```

### Cleanup Taking Too Long

**Symptoms:** Worker timing out, partial cleanup

The worker has built-in safeguards:
- **BATCH_SIZE = 1000** - Deletes in chunks to avoid D1 timeouts
- **MAX_BATCHES = 50** - Caps total deletions per run at 50,000

If you have a massive backlog:

```sql
-- Check how many expired webhooks exist
SELECT COUNT(*) FROM webhook_events
WHERE expires_at IS NOT NULL AND expires_at < unixepoch();
```

If >50,000, the worker will clean up over multiple days. For immediate cleanup, run manually multiple times or temporarily increase `MAX_BATCHES`.

### Nothing Getting Deleted

**Symptoms:** Worker runs successfully but reports 0 deletions, table is full

**Checks:**
```sql
-- Check if webhooks have expires_at set
SELECT
  COUNT(*) as total,
  COUNT(expires_at) as with_expiry,
  COUNT(*) - COUNT(expires_at) as without_expiry
FROM webhook_events;

-- Check oldest expires_at values
SELECT expires_at, datetime(expires_at, 'unixepoch') as expires_date
FROM webhook_events
WHERE expires_at IS NOT NULL
ORDER BY expires_at ASC
LIMIT 5;
```

**Possible causes:**
1. **Old webhooks lack `expires_at`** - Migration didn't backfill existing records
2. **Expiry dates are in the future** - Working as intended, wait for expiry

**Fix for old webhooks:**
```sql
-- Backfill expires_at for old webhooks (120 days from creation)
UPDATE webhook_events
SET expires_at = created_at + (120 * 24 * 60 * 60)
WHERE expires_at IS NULL;
```

---

## Tenant Isolation Note

The `webhook_events` table is **platform-level**, not tenant-scoped. This is intentional because:

1. **Webhooks arrive before tenant creation** - `subscription_created` event triggers tenant creation
2. **Webhook provider IDs are global** - LemonSqueezy customer IDs aren't tenant-specific
3. **Cleanup is time-based** - All webhooks expire after 120 days regardless of tenant

The cleanup worker safely operates across all webhooks without tenant filtering.

---

## Database Schema

The cleanup relies on the `expires_at` column and its index:

```sql
-- Added by migration 026_webhook_retention.sql

-- Column for retention tracking
ALTER TABLE webhook_events ADD COLUMN expires_at INTEGER;

-- Partial index for efficient cleanup queries
CREATE INDEX idx_webhook_events_expires_at
ON webhook_events(expires_at)
WHERE expires_at IS NOT NULL;
```

### Cleanup Query

```sql
DELETE FROM webhook_events
WHERE id IN (
  SELECT id FROM webhook_events
  WHERE expires_at IS NOT NULL AND expires_at < ?
  LIMIT 1000
)
```

The subquery pattern is used because D1 doesn't support `DELETE ... LIMIT` directly.

---

## Disaster Recovery

### If Cleanup Hasn't Run for Weeks

1. **Assess the backlog:**
   ```sql
   SELECT COUNT(*) FROM webhook_events
   WHERE expires_at IS NOT NULL AND expires_at < unixepoch();
   ```

2. **Run manual cleanup:**
   ```bash
   # Each call deletes up to 50,000 records
   curl https://grove-webhook-cleanup.<subdomain>.workers.dev/
   ```

   Repeat until response shows `"deleted": 0`

3. **Verify cron is working:**
   ```bash
   wrangler triggers list
   ```

### If You Need to Restore Deleted Webhooks

**You can't.** Deleted webhooks are permanently removed. This is by design for data minimization.

If you need webhook data for debugging:
1. Check Cloudflare Worker logs (retained for 7 days)
2. Check LemonSqueezy dashboard for webhook delivery history
3. Request webhook replay from LemonSqueezy support

---

## Related Documentation

- [Webhook Data Protection](../security/webhook-data-protection.md) - PII sanitization details
- [Cloudflare Architecture](./cloudflare-architecture-guide.md) - Overall infrastructure
- [D1 Database Setup](./cloudflare-setup.md) - Database configuration
