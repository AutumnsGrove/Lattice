# Rings Analytics: Durable Objects Integration

> **✅ MERGED:** This content has been integrated into `docs/specs/rings-spec.md` (2025-12-25).
> This file is kept for reference. The spec is the authoritative source.

## Context for Agent

This document contains new architectural findings that should be integrated into the Rings project specification. Rings is Grove's privacy-focused analytics system. The core discovery is that Durable Objects provide the missing coordination layer for real-time analytics aggregation, dramatically reducing D1 write load while enabling live dashboards.

**Your task:** Review the existing Rings project spec and integrate these Durable Objects patterns. Update the spec to reflect this new architecture while preserving the existing privacy and security requirements.

---

## Key Insight

Analytics events flow from many sources (page views, reactions, comments, etc.) and need to be:
1. Collected in real-time
2. Aggregated before storage (to reduce D1 writes)
3. Available for live dashboards
4. Isolated per-tenant for privacy

Durable Objects solve all of these by providing:
- **Per-tenant isolation** — Each tenant's analytics live in their own DO
- **Batched writes** — Aggregate in memory, flush to D1 periodically
- **Real-time access** — WebSocket for live dashboard updates
- **Atomic operations** — No lost increments, no race conditions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ANALYTICS FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

Event occurs (page view, reaction, etc.)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Source DO (TenantDO, PostDO, SessionDO)                                 │
│  - Captures event with minimal processing                               │
│  - Forwards to AnalyticsDO                                              │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ AnalyticsDO (id: analytics:{tenantId}:{date})                          │
│  - Receives all events for this tenant on this day                     │
│  - Aggregates in memory (page views, unique visitors, etc.)            │
│  - Updates live dashboard via WebSocket                                │
│  - Flushes to D1 every 60 seconds                                      │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (every 60 seconds)
┌─────────────────────────────────────────────────────────────────────────┐
│ D1 Database (rings tables)                                              │
│  - Stores finalized hourly/daily aggregates                            │
│  - Historical data for reporting                                        │
│  - Never receives raw events (only aggregates)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Durable Object Design

### AnalyticsDO

**ID Pattern:** `analytics:{tenantId}:{date}` (e.g., `analytics:alice:2025-12-25`)

One DO per tenant per day. This provides:
- Natural partitioning (no single DO gets too hot)
- Easy cleanup of old data
- Simple date-based queries

**SQLite Storage:**

```sql
-- Hourly aggregates (0-23)
CREATE TABLE hourly (
  hour INTEGER PRIMARY KEY,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  avg_time_on_page REAL,
  bounce_rate REAL,
  posts_created INTEGER NOT NULL DEFAULT 0,
  comments_created INTEGER NOT NULL DEFAULT 0,
  reactions_given INTEGER NOT NULL DEFAULT 0
);

-- Per-page stats
CREATE TABLE pages (
  path TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0,
  avg_time_seconds REAL,
  entries INTEGER NOT NULL DEFAULT 0,  -- Started session on this page
  exits INTEGER NOT NULL DEFAULT 0     -- Left site from this page
);

-- Referrer tracking
CREATE TABLE referrers (
  source TEXT PRIMARY KEY,  -- Domain or 'direct'
  visits INTEGER NOT NULL DEFAULT 0
);

-- Unique visitor hashes (for deduplication)
-- Hash of IP + User-Agent, NOT stored long-term
CREATE TABLE visitors (
  hash TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 1
);

-- Content performance (posts, not pages)
CREATE TABLE content (
  post_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0,
  reactions INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  avg_read_time REAL
);
```

**In-Memory State:**

```typescript
interface AnalyticsDOState {
  tenantId: string;
  date: string;  // YYYY-MM-DD
  
  // Real-time counters (fast access)
  currentHour: number;
  hourlyStats: Map<number, HourlyStats>;
  
  // Pending events (not yet aggregated)
  eventBuffer: AnalyticsEvent[];
  
  // Connected dashboards
  dashboardConnections: Map<string, WebSocket>;
  
  // Flush tracking
  lastFlushAt: number;
  pendingFlush: boolean;
}
```

---

## Event Types

Define a standard event schema that all Grove components emit:

```typescript
interface AnalyticsEvent {
  type: EventType;
  timestamp: number;
  
  // Visitor identification (privacy-preserving)
  visitorHash: string;  // Hash of IP + UA, not raw values
  
  // Context
  path?: string;
  postId?: string;
  referrer?: string;
  
  // Event-specific data
  data?: Record<string, unknown>;
}

type EventType =
  | "page_view"
  | "page_exit"
  | "post_view"
  | "post_read_complete"  // Scrolled to end
  | "reaction"
  | "comment"
  | "share"
  | "search"
  | "signup"
  | "login";
```

---

## Privacy Considerations

### What We Store

- **Visitor hash:** One-way hash of IP + User-Agent, rotated daily
- **Aggregate counts:** Page views, unique visitors, etc.
- **Content metrics:** Per-post engagement (visible only to post author)

### What We DON'T Store

- Raw IP addresses
- User-Agent strings
- Individual user tracking across days
- Third-party identifiers
- Cookies for analytics (only auth cookies exist)

### Hash Rotation

The visitor hash salt changes daily:

```typescript
function getVisitorHash(ip: string, userAgent: string, date: string): string {
  const salt = `grove-analytics-${date}`;  // Date-based salt
  return crypto.createHash("sha256")
    .update(`${salt}:${ip}:${userAgent}`)
    .digest("hex")
    .substring(0, 16);
}
```

This means:
- Same visitor on same day = same hash (for unique counting)
- Same visitor on different day = different hash (no cross-day tracking)
- Cannot reverse hash to get IP

---

## Real-Time Dashboard

The AnalyticsDO supports WebSocket connections for live dashboards:

```typescript
class AnalyticsDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    
    // ... other routes
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    
    const connectionId = crypto.randomUUID();
    this.dashboardConnections.set(connectionId, server);

    // Send current stats immediately
    server.send(JSON.stringify({
      type: "init",
      stats: await this.getCurrentStats(),
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  // Called when new events are recorded
  private broadcastUpdate(stats: Partial<DashboardStats>) {
    const message = JSON.stringify({ type: "update", stats });
    for (const ws of this.dashboardConnections.values()) {
      try {
        ws.send(message);
      } catch {
        // Connection dead, will be cleaned up
      }
    }
  }
}
```

### Dashboard Message Types

```typescript
// Server -> Client
type ServerMessage =
  | { type: "init"; stats: FullStats }
  | { type: "update"; stats: Partial<Stats> }
  | { type: "event"; event: RecentEvent };

// Client -> Server  
type ClientMessage =
  | { type: "subscribe"; metrics: string[] }
  | { type: "unsubscribe"; metrics: string[] };
```

---

## D1 Schema (Long-Term Storage)

The DO flushes aggregated data to D1 for historical reporting:

```sql
-- Daily summaries per tenant
CREATE TABLE daily_stats (
  tenant_id TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  page_views INTEGER NOT NULL,
  unique_visitors INTEGER NOT NULL,
  avg_session_duration REAL,
  bounce_rate REAL,
  top_pages TEXT,      -- JSON array
  top_referrers TEXT,  -- JSON array
  PRIMARY KEY (tenant_id, date)
);

-- Hourly breakdown (for charts)
CREATE TABLE hourly_stats (
  tenant_id TEXT NOT NULL,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  page_views INTEGER NOT NULL,
  unique_visitors INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, date, hour)
);

-- Content performance over time
CREATE TABLE content_stats (
  tenant_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  date TEXT NOT NULL,
  views INTEGER NOT NULL,
  unique_views INTEGER NOT NULL,
  reactions INTEGER NOT NULL,
  comments INTEGER NOT NULL,
  avg_read_time REAL,
  PRIMARY KEY (tenant_id, post_id, date)
);

-- Indexes
CREATE INDEX idx_daily_tenant ON daily_stats(tenant_id, date DESC);
CREATE INDEX idx_content_post ON content_stats(post_id, date DESC);
```

---

## Integration with Other DOs

### TenantDO → AnalyticsDO

TenantDO captures page views and forwards to AnalyticsDO:

```typescript
// In TenantDO
async recordPageView(params: {
  path: string;
  visitorHash: string;
  referrer?: string;
}) {
  // Quick local tracking
  this.pageViewCount++;
  
  // Forward to AnalyticsDO for full processing
  const today = new Date().toISOString().split("T")[0];
  const analyticsDO = this.env.ANALYTICS.get(
    this.env.ANALYTICS.idFromName(`analytics:${this.tenantId}:${today}`)
  );
  
  await analyticsDO.recordEvent({
    type: "page_view",
    timestamp: Date.now(),
    visitorHash: params.visitorHash,
    path: params.path,
    referrer: params.referrer,
  });
}
```

### PostDO → AnalyticsDO

PostDO tracks content engagement:

```typescript
// In PostDO
async recordReaction(userId: string, reactionType: string) {
  // Update local reaction counts
  await this.toggleReaction(userId, reactionType);
  
  // Forward to analytics
  const today = new Date().toISOString().split("T")[0];
  const analyticsDO = this.env.ANALYTICS.get(
    this.env.ANALYTICS.idFromName(`analytics:${this.tenantId}:${today}`)
  );
  
  await analyticsDO.recordEvent({
    type: "reaction",
    timestamp: Date.now(),
    postId: this.postId,
    data: { reactionType },
  });
}
```

---

## Flush Strategy

The AnalyticsDO batches writes to D1:

```typescript
class AnalyticsDO extends DurableObject {
  private async scheduleFlush() {
    if (this.pendingFlush) return;
    
    this.pendingFlush = true;
    
    // Flush every 60 seconds
    await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }

  async alarm() {
    await this.flush();
    this.pendingFlush = false;
    
    // If we still have data, schedule another flush
    if (this.eventBuffer.length > 0 || this.hasUnflushedStats()) {
      await this.scheduleFlush();
    }
  }

  private async flush() {
    // Aggregate buffered events
    const aggregated = this.aggregateEvents(this.eventBuffer);
    this.eventBuffer = [];
    
    // Update SQLite storage
    await this.updateLocalStats(aggregated);
    
    // Write to D1 (batched)
    await this.flushToD1();
    
    this.lastFlushAt = Date.now();
  }

  private async flushToD1() {
    const stats = await this.getCurrentStats();
    
    await this.env.DB.batch([
      this.env.DB.prepare(`
        INSERT INTO hourly_stats (tenant_id, date, hour, page_views, unique_visitors)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET
          page_views = page_views + excluded.page_views,
          unique_visitors = excluded.unique_visitors
      `).bind(
        this.tenantId,
        this.date,
        this.currentHour,
        stats.hourly[this.currentHour].pageViews,
        stats.hourly[this.currentHour].uniqueVisitors
      ),
      // ... other updates
    ]);
  }
}
```

---

## End-of-Day Finalization

At midnight, the AnalyticsDO finalizes the day's data:

```typescript
async finalize() {
  // Final flush
  await this.flush();
  
  // Calculate daily aggregates
  const dailyStats = this.calculateDailyStats();
  
  // Write final summary to D1
  await this.env.DB.prepare(`
    INSERT INTO daily_stats (tenant_id, date, page_views, unique_visitors, avg_session_duration, bounce_rate, top_pages, top_referrers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    this.tenantId,
    this.date,
    dailyStats.pageViews,
    dailyStats.uniqueVisitors,
    dailyStats.avgSessionDuration,
    dailyStats.bounceRate,
    JSON.stringify(dailyStats.topPages),
    JSON.stringify(dailyStats.topReferrers)
  ).run();
  
  // Clear visitor hashes (privacy)
  await this.ctx.storage.sql.exec(`DELETE FROM visitors`);
  
  // Close any remaining WebSocket connections
  for (const ws of this.dashboardConnections.values()) {
    ws.close(1000, "Day ended");
  }
  
  console.log(`[AnalyticsDO] Finalized ${this.tenantId}/${this.date}`);
}
```

---

## API Endpoints

### Record Event (Internal)

Called by other DOs, not exposed publicly:

```typescript
// RPC method on AnalyticsDO
async recordEvent(event: AnalyticsEvent): Promise<void>;
async recordEvents(events: AnalyticsEvent[]): Promise<void>;
```

### Get Stats (Dashboard)

```typescript
// GET /analytics/today
// Returns current day's stats

// GET /analytics/range?start=2025-12-01&end=2025-12-25
// Returns historical stats from D1

// WebSocket /analytics/live
// Real-time updates
```

---

## Write Reduction Analysis

**Before (Direct D1):**
- 10,000 page views/day = 10,000 D1 writes
- 1,000 reactions/day = 1,000 D1 writes
- Total: 11,000 writes/day

**After (With AnalyticsDO):**
- 10,000 page views → buffered in DO → 1,440 writes (once per minute)
- 1,000 reactions → buffered in DO → same flush cycle
- Plus 1 daily summary write
- Total: ~1,441 writes/day

**Reduction: 87%**

At scale (100 tenants, 10K views each):
- Before: 1,100,000 writes/day
- After: ~144,100 writes/day
- Savings at $0.25/million writes: Significant

---

## Implementation Checklist

- [ ] Create AnalyticsDO class with SQLite schema
- [ ] Implement event recording and aggregation
- [ ] Add WebSocket support for live dashboard
- [ ] Implement flush-to-D1 logic with alarms
- [ ] Add end-of-day finalization
- [ ] Update TenantDO to forward page views
- [ ] Update PostDO to forward content events
- [ ] Create D1 schema for long-term storage
- [ ] Build dashboard API routes
- [ ] Create frontend dashboard components
- [ ] Add privacy controls (hash rotation, data deletion)

---

## Privacy Compliance Notes

For GDPR/CCPA compliance:

1. **No personal data stored** — Only hashed identifiers that rotate daily
2. **Tenant isolation** — Each tenant's data in separate DO
3. **Right to erasure** — Delete tenant's AnalyticsDOs and D1 records
4. **Data minimization** — Only collect what's needed
5. **Purpose limitation** — Analytics only, not tracking

Add a data deletion method:

```typescript
async deleteAllTenantData(tenantId: string) {
  // Delete all AnalyticsDOs for this tenant
  // This requires listing all dates, which could be stored in D1
  const dates = await this.env.DB.prepare(
    "SELECT DISTINCT date FROM daily_stats WHERE tenant_id = ?"
  ).bind(tenantId).all();
  
  for (const row of dates.results) {
    const doId = this.env.ANALYTICS.idFromName(`analytics:${tenantId}:${row.date}`);
    const do_ = this.env.ANALYTICS.get(doId);
    await do_.deleteAllData();  // Method on AnalyticsDO
  }
  
  // Delete D1 records
  await this.env.DB.batch([
    this.env.DB.prepare("DELETE FROM daily_stats WHERE tenant_id = ?").bind(tenantId),
    this.env.DB.prepare("DELETE FROM hourly_stats WHERE tenant_id = ?").bind(tenantId),
    this.env.DB.prepare("DELETE FROM content_stats WHERE tenant_id = ?").bind(tenantId),
  ]);
}
```
