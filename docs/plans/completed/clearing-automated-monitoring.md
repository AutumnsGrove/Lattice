# Automated Status Monitoring for The Clearing

## Overview

Build an **automated monitoring system** that actively monitors Grove's 6 components and feeds real data into The Clearing status page. Currently, The Clearing shows "100% operational" always because nothing feeds it real data.

## Architecture

```
  grove-clearing-monitor (Cron Worker, every 2 min)
       │
       ├──► Fetch /health endpoints from each service
       │
       ├──► Store results in KV (consecutive failure tracking)
       │
       ├──► Update D1: status_components, status_incidents, status_daily_history
       │
       ├──► Send email alerts via Resend when incidents created/resolved
       │
       └──► The Clearing reads from D1 → Real status displayed!
```

## Components to Monitor

| Component | Health Endpoint | Check Type |
|-----------|----------------|------------|
| Blog Engine | `https://example.grove.place/api/health` | Deep (D1 query) |
| CDN | `HEAD https://cdn.grove.place/health-check.txt` | Shallow |
| Authentication | `https://auth.grove.place/health` | Deep (Heartwood) |
| Meadow | `https://meadow.grove.place/api/health` | Deep |
| Payments | `https://grove.place/api/health/payments` | Shallow |
| API (DOs) | `https://grove-durable-objects.workers.dev/health` | Shallow |

## Implementation Phases

### Phase 1: Health Check Endpoints (Week 1)

**Create health endpoints on each service:**

1. **`packages/engine/src/routes/api/health/+server.ts`** - Engine health
   - Check D1 connectivity
   - Check KV connectivity
   - Return standardized response: `{ status, service, checks[], timestamp }`

2. **`packages/engine/src/routes/api/health/payments/+server.ts`** - Payment subsystem
   - Verify payment config exists
   - Shallow check (don't call Stripe/Lemon)

3. **Upload `cdn-health-check.txt`** to R2 bucket for CDN monitoring

4. **Add `/health` to auth and meadow services** if not present

### Phase 2: Monitor Cron Worker (Week 2)

**Create `packages/workers/clearing-monitor/`:**

```
packages/workers/clearing-monitor/
├── src/
│   ├── index.ts              # Main cron handler
│   ├── config.ts             # Component URLs, thresholds
│   ├── health-checks.ts      # Fetch + measure latency
│   ├── incident-manager.ts   # Create/resolve incidents
│   └── daily-history.ts      # End-of-day aggregation
├── wrangler.toml
├── package.json
└── tests/
```

**Wrangler config:**
```toml
name = "grove-clearing-monitor"
[triggers]
crons = ["*/2 * * * *", "0 0 * * *"]  # Every 2 min + daily midnight

[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"

[[kv_namespaces]]
binding = "MONITOR_KV"
```

### Phase 3: Status Logic

**Latency thresholds (configurable per component):**
- `operational`: < 500ms
- `degraded`: 500-1500ms
- `partial_outage`: 1500-3000ms
- `major_outage`: > 3000ms or HTTP error

**False positive mitigation:**
- **3 consecutive failures** → Create incident
- **2 consecutive successes** → Resolve incident
- Store state in KV: `monitor:{component_id}` → `{ consecutiveFailures, activeIncidentId }`

**Incident creation flow:**
1. Insert into `status_incidents` (investigating, auto-generated title)
2. Link to component via `status_incident_components`
3. Add initial update to `status_updates`
4. Update `status_components.current_status`

**Daily history (midnight cron):**
- Query incidents that overlapped with yesterday
- Determine worst status of the day
- Upsert into `status_daily_history`

### Phase 4: Testing (Week 3)

**Test files:**
- `tests/health-checks.test.ts` - Mock fetch, verify latency classification
- `tests/incident-manager.test.ts` - Consecutive failure logic
- `tests/daily-history.test.ts` - Aggregation logic

**Use existing mock patterns** from `packages/engine/tests/utils/setup.ts`

### Phase 5: CI/CD

**Create `.github/workflows/deploy-clearing-monitor.yml`:**
- Trigger on `packages/workers/clearing-monitor/**` changes
- Run tests
- Deploy via wrangler

### Phase 6: Email Notifications (Resend)

**Add email alerts in incident-manager.ts:**
```typescript
// When incident created:
await sendEmail({
  to: 'alerts@grove.place',
  subject: `[Grove] Incident: ${componentName} - ${status}`,
  body: `Automated monitoring detected an issue...`
});

// When incident resolved:
await sendEmail({
  to: 'alerts@grove.place',
  subject: `[Grove] Resolved: ${componentName} back to operational`,
  body: `Service has recovered...`
});
```

**Wrangler secret:** `RESEND_API_KEY` (already used elsewhere in Grove)

### Phase 7: External Monitoring (UptimeRobot)

**UptimeRobot** - free external uptime monitoring as backup:
- **Free tier**: 50 monitors total, 5-minute intervals, email alerts
- **Cost**: $0/month

**Setup 6 monitors:**

| Monitor Name | URL | Alert Contact |
|--------------|-----|---------------|
| Grove Engine | `https://example.grove.place/api/health` | Your email |
| Grove CDN | `https://cdn.grove.place/health-check.txt` | Your email |
| Grove Auth | `https://auth.grove.place/health` | Your email |
| Grove Meadow | `https://meadow.grove.place/api/health` | Your email |
| Grove Status | `https://status.grove.place` | Your email |
| Grove Landing | `https://grove.place` | Your email |

**Why both?**
- **Internal monitor**: Detailed health data, 2-min checks, auto-incident creation, feeds The Clearing
- **UptimeRobot** (external): Independent backup, runs outside Cloudflare, catches issues internal monitor might miss

## Key Files to Create

| File | Purpose |
|------|---------|
| `packages/workers/clearing-monitor/src/index.ts` | Main cron worker |
| `packages/workers/clearing-monitor/wrangler.toml` | Worker config with crons |
| `packages/engine/src/routes/api/health/+server.ts` | Engine health endpoint |
| `packages/engine/src/routes/api/health/payments/+server.ts` | Payments health |
| `.github/workflows/deploy-clearing-monitor.yml` | CI/CD for monitor |

## Key Files to Reference

| File | Purpose |
|------|---------|
| `packages/clearing/src/lib/server/status.ts` | Existing D1 queries |
| `packages/clearing/src/lib/types/status.ts` | Status type definitions |
| `packages/clearing/migrations/0001_status_tables.sql` | D1 schema |
| `packages/workers/webhook-cleanup/` | Existing cron worker pattern |

## Verification

1. **Manual test:** `curl https://clearing-monitor.workers.dev/` should return check results
2. **Check D1:** Query `status_components` to see updated statuses
3. **Check Clearing:** Status page should show real data
4. **Simulate outage:** Block a health endpoint, verify incident created after 3 checks (~6 min)
5. **Verify recovery:** Unblock endpoint, verify incident resolved after 2 checks (~4 min)

## Decisions Made

- ✅ **Domain URLs**: Using grove.place ecosystem (example.grove.place, auth.grove.place, cdn.grove.place, etc.)
- ✅ **Notifications**: Email via Resend to `alerts@grove.place` when incidents are created/resolved
- ✅ **External monitoring**: Yes, use UptimeRobot free tier as backup alongside internal monitor
- ✅ **Auto-incidents**: All 6 services will auto-create incidents (full automation)
