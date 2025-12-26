# TenantDO Implementation Plan (DO Phase 2)

> **Status:** Ready to implement
> **Priority:** High - Reduces D1 load, enables per-tenant rate limiting
> **Estimated Effort:** 2-3 days of focused work

---

## Overview

TenantDO is a Durable Object that coordinates per-tenant operations:
- **Config caching** — Eliminates D1 queries on every request
- **Rate limiting** — Per-tenant (not just IP-based)
- **Analytics buffering** — Reduces D1 writes by ~90%

**ID Pattern:** `tenant:{subdomain}` (e.g., `tenant:alice`, `tenant:midnightbloom`)

---

## Architecture Decision: Where to Implement

**Option A: In GroveEngine (recommended)**
- TenantDO lives alongside the engine that serves tenant sites
- Direct access to D1 for config refresh
- Simpler deployment (single worker with DO)

**Option B: In GroveAuth**
- Centralized coordination service
- But auth and tenant are separate concerns
- More complex service binding setup

**Recommendation:** Implement in GroveEngine (`packages/engine`).

---

## Implementation Steps

### Step 1: Create TenantDO Class

**File:** `packages/engine/src/durables/TenantDO.ts`

```typescript
/**
 * TenantDO - Durable Object for Per-Tenant Coordination
 *
 * Each tenant (subdomain) gets their own TenantDO instance.
 * Provides: config caching, rate limiting, analytics buffering.
 */

import { DurableObject } from 'cloudflare:workers';

export interface TenantConfig {
  id: string;
  subdomain: string;
  displayName: string;
  email: string;
  theme: string | null;
  tier: 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
  active: boolean;
  createdAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface AnalyticsEvent {
  type: 'page_view' | 'post_view' | 'reaction' | 'comment';
  path: string;
  postId?: string;
  visitorHash: string; // Privacy-preserving visitor ID
  timestamp: number;
  referrer?: string;
  userAgent?: string;
}

interface TenantDOEnv {
  DB: D1Database;
}

export class TenantDO extends DurableObject<TenantDOEnv> {
  private initialized = false;
  private config: TenantConfig | null = null;
  private configLoadedAt: number = 0;
  private readonly CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(ctx: DurableObjectState, env: TenantDOEnv) {
    super(ctx, env);
  }

  /**
   * Initialize SQLite tables on first access
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Rate limits table
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL
      );
    `);

    // Analytics buffer table
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS analytics_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        post_id TEXT,
        visitor_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        referrer TEXT,
        user_agent TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
    `);

    this.initialized = true;
  }

  /**
   * Get tenant config (cached, refreshes from D1 periodically)
   */
  async getConfig(): Promise<TenantConfig | null> {
    await this.initialize();

    const now = Date.now();

    // Return cached config if still valid
    if (this.config && (now - this.configLoadedAt) < this.CONFIG_TTL) {
      return this.config;
    }

    // Extract subdomain from DO name (format: tenant:{subdomain})
    const subdomain = this.ctx.id.name?.replace('tenant:', '') || '';

    if (!subdomain) {
      console.error('[TenantDO] No subdomain in DO name');
      return null;
    }

    // Refresh from D1
    try {
      const result = await this.env.DB
        .prepare(`
          SELECT id, subdomain, display_name, email, theme, tier, active, created_at
          FROM tenants
          WHERE subdomain = ? AND active = 1
        `)
        .bind(subdomain)
        .first<{
          id: string;
          subdomain: string;
          display_name: string;
          email: string;
          theme: string | null;
          tier: string;
          active: number;
          created_at: number;
        }>();

      if (!result) {
        this.config = null;
        this.configLoadedAt = now;
        return null;
      }

      this.config = {
        id: result.id,
        subdomain: result.subdomain,
        displayName: result.display_name,
        email: result.email,
        theme: result.theme,
        tier: result.tier as TenantConfig['tier'],
        active: result.active === 1,
        createdAt: result.created_at,
      };
      this.configLoadedAt = now;

      console.log(`[TenantDO] Loaded config for ${subdomain}`);
      return this.config;
    } catch (err) {
      console.error('[TenantDO] Failed to load config:', err);
      return this.config; // Return stale config if available
    }
  }

  /**
   * Invalidate cached config (call when tenant updates settings)
   */
  async invalidateConfig(): Promise<void> {
    this.config = null;
    this.configLoadedAt = 0;
  }

  /**
   * Check rate limit for a specific key
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    await this.initialize();

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Get current state
    const result = await this.ctx.storage.sql
      .exec(`SELECT count, window_start FROM rate_limits WHERE key = ?`, key)
      .toArray();

    let count = 0;
    let currentWindowStart = now;

    if (result.length > 0) {
      const row = result[0];
      if ((row.window_start as number) > windowStart) {
        // Still in current window
        count = row.count as number;
        currentWindowStart = row.window_start as number;
      }
      // Else: window expired, will reset
    }

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: currentWindowStart + windowSeconds * 1000,
      };
    }

    // Increment count
    await this.ctx.storage.sql.exec(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE
           WHEN window_start < ? THEN 1
           ELSE count + 1
         END,
         window_start = CASE
           WHEN window_start < ? THEN ?
           ELSE window_start
         END`,
      key, now, windowStart, windowStart, now
    );

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: currentWindowStart + windowSeconds * 1000,
    };
  }

  /**
   * Record an analytics event (buffered)
   */
  async recordEvent(event: AnalyticsEvent): Promise<void> {
    await this.initialize();

    await this.ctx.storage.sql.exec(
      `INSERT INTO analytics_buffer (type, path, post_id, visitor_hash, timestamp, referrer, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      event.type,
      event.path,
      event.postId || null,
      event.visitorHash,
      event.timestamp,
      event.referrer || null,
      event.userAgent || null
    );

    // Schedule flush if not already scheduled
    await this.scheduleFlush();
  }

  /**
   * Schedule analytics flush alarm
   */
  private async scheduleFlush(): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm) {
      // Flush every 60 seconds
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
    }
  }

  /**
   * Alarm handler - flush analytics to D1
   */
  async alarm(): Promise<void> {
    await this.initialize();
    await this.flushAnalytics();
  }

  /**
   * Flush buffered analytics to D1
   */
  async flushAnalytics(): Promise<void> {
    const events = await this.ctx.storage.sql
      .exec(`SELECT * FROM analytics_buffer ORDER BY id LIMIT 1000`)
      .toArray();

    if (events.length === 0) {
      return;
    }

    const config = await this.getConfig();
    if (!config) {
      console.error('[TenantDO] Cannot flush analytics: no config');
      return;
    }

    try {
      // Batch insert into D1 analytics table
      const stmt = this.env.DB.prepare(`
        INSERT INTO analytics_events (tenant_id, type, path, post_id, visitor_hash, timestamp, referrer, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batch = events.map((e) =>
        stmt.bind(
          config.id,
          e.type,
          e.path,
          e.post_id,
          e.visitor_hash,
          e.timestamp,
          e.referrer,
          e.user_agent
        )
      );

      await this.env.DB.batch(batch);

      // Delete flushed events
      const ids = events.map((e) => e.id);
      await this.ctx.storage.sql.exec(
        `DELETE FROM analytics_buffer WHERE id IN (${ids.join(',')})`
      );

      console.log(`[TenantDO] Flushed ${events.length} analytics events for ${config.subdomain}`);
    } catch (err) {
      console.error('[TenantDO] Failed to flush analytics:', err);
      // Events remain in buffer, will retry on next alarm
    }

    // Check if more events to flush
    const remaining = await this.ctx.storage.sql
      .exec(`SELECT COUNT(*) as count FROM analytics_buffer`)
      .toArray();

    if ((remaining[0]?.count as number) > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
    }
  }

  /**
   * Get buffered event count (for monitoring)
   */
  async getBufferCount(): Promise<number> {
    await this.initialize();

    const result = await this.ctx.storage.sql
      .exec(`SELECT COUNT(*) as count FROM analytics_buffer`)
      .toArray();

    return (result[0]?.count as number) || 0;
  }
}
```

---

### Step 2: Export TenantDO and Add Wrangler Config

**File:** `packages/engine/src/index.ts` (add export)

```typescript
// Add at the end of the file
export { TenantDO } from './durables/TenantDO.js';
```

**File:** `packages/engine/wrangler.toml` (add DO binding)

```toml
# Add after existing bindings

# Durable Objects - TenantDO for per-tenant coordination
[[durable_objects.bindings]]
name = "TENANTS"
class_name = "TenantDO"

# Add migration for SQLite-backed DO
[[migrations]]
tag = "v1"
new_sqlite_classes = ["TenantDO"]
```

---

### Step 3: Create D1 Migration for Analytics Events

**File:** `packages/engine/migrations/XXX_analytics_events.sql`

```sql
-- Analytics events table (populated by TenantDO flush)
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  post_id TEXT,
  visitor_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_timestamp
  ON analytics_events(tenant_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_analytics_type
  ON analytics_events(type);

CREATE INDEX IF NOT EXISTS idx_analytics_path
  ON analytics_events(path);
```

---

### Step 4: Update hooks.server.ts to Use TenantDO

**File:** `packages/engine/src/hooks.server.ts`

Replace the D1 tenant lookup with TenantDO:

```typescript
// Add import at top
import type { TenantDO } from './durables/TenantDO.js';

// Replace the tenant lookup section (around line 169-210) with:

// Must be a tenant subdomain - use TenantDO for cached config
else {
  const tenantsDO = event.platform?.env?.TENANTS;

  if (!tenantsDO) {
    console.error("[Hooks] TENANTS DO binding not available, falling back to D1");
    // Fallback to D1 (existing code)
    const db = event.platform?.env?.DB;
    if (!db) {
      event.locals.context = { type: "not_found", subdomain };
    } else {
      // ... existing D1 fallback code ...
    }
  } else {
    try {
      const tenantDO = tenantsDO.get(
        tenantsDO.idFromName(`tenant:${subdomain}`)
      ) as DurableObjectStub<TenantDO>;

      const config = await tenantDO.getConfig();

      if (!config) {
        event.locals.context = { type: "not_found", subdomain };
      } else {
        // Check rate limit (60 requests per minute per tenant)
        const rateCheck = await tenantDO.checkRateLimit("requests", 60, 60);
        if (!rateCheck.allowed) {
          // Return 429 Too Many Requests
          return new Response("Rate limited", {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
            },
          });
        }

        // Valid tenant - set context
        event.locals.context = {
          type: "tenant",
          tenant: {
            id: config.id,
            subdomain: config.subdomain,
            name: config.displayName,
            theme: config.theme,
            ownerId: config.email,
            tier: config.tier,
          },
        };
        event.locals.tenantId = config.id;

        // Record page view (non-blocking)
        const visitorHash = await generateVisitorHash(event.request, subdomain);
        tenantDO.recordEvent({
          type: "page_view",
          path: event.url.pathname,
          visitorHash,
          timestamp: Date.now(),
          referrer: event.request.headers.get("referer") || undefined,
          userAgent: event.request.headers.get("user-agent") || undefined,
        }).catch((err) => console.error("[Analytics] Failed to record:", err));
      }
    } catch (err) {
      console.error("[Hooks] Error calling TenantDO:", err);
      event.locals.context = { type: "not_found", subdomain };
    }
  }
}

// Add helper function for privacy-preserving visitor hash
async function generateVisitorHash(request: Request, subdomain: string): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const date = new Date().toISOString().split("T")[0]; // Daily rotation

  const data = `${ip}|${ua}|${subdomain}|${date}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = new Uint8Array(hashBuffer);

  let binary = "";
  for (let i = 0; i < hashArray.length; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }
  return btoa(binary).substring(0, 16); // First 16 chars
}
```

---

### Step 5: Update Type Definitions

**File:** `packages/engine/src/app.d.ts`

```typescript
// Add to Env interface
interface Env {
  // ... existing bindings ...
  TENANTS: DurableObjectNamespace;
}

// Update TenantContext
interface TenantContext {
  type: "tenant";
  tenant: {
    id: string;
    subdomain: string;
    name: string;
    theme: string | null;
    ownerId: string;
    tier: 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
  };
}
```

---

### Step 6: Add Config Invalidation Endpoint

**File:** `packages/engine/src/routes/api/admin/tenant/invalidate-cache/+server.ts`

```typescript
/**
 * POST /api/admin/tenant/invalidate-cache
 * Invalidates the TenantDO config cache after settings change
 */
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { TenantDO } from "$lib/../durables/TenantDO.js";

export const POST: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!locals.tenantId) {
    throw error(400, "No tenant context");
  }

  const tenantsDO = platform?.env?.TENANTS;
  if (!tenantsDO) {
    throw error(500, "TENANTS binding not available");
  }

  const context = locals.context;
  if (context.type !== "tenant") {
    throw error(400, "Not a tenant context");
  }

  try {
    const tenantDO = tenantsDO.get(
      tenantsDO.idFromName(`tenant:${context.tenant.subdomain}`)
    ) as DurableObjectStub<TenantDO>;

    await tenantDO.invalidateConfig();

    return json({ success: true });
  } catch (err) {
    console.error("[InvalidateCache] Error:", err);
    throw error(500, "Failed to invalidate cache");
  }
};
```

---

## Deployment Commands

**File:** `docs/plans/tenant-do-deploy-commands.sh`

```bash
#!/bin/bash
# TenantDO Deployment Commands
# Run these locally after implementing the code changes

set -e

echo "=== TenantDO Deployment ==="

# Step 1: Run D1 migration
echo "Step 1: Running D1 migration..."
cd packages/engine
wrangler d1 migrations apply grove-engine-db --remote

# Step 2: Deploy engine with TenantDO
echo "Step 2: Deploying engine with TenantDO..."
wrangler deploy

# Step 3: Verify deployment
echo "Step 3: Verifying deployment..."
curl -s https://groveengine.grove.place/api/health | jq .

echo "=== Deployment Complete ==="
echo ""
echo "To test TenantDO:"
echo "  1. Visit any tenant subdomain (e.g., alice.grove.place)"
echo "  2. Check Cloudflare dashboard for DO metrics"
echo "  3. Verify rate limiting works (spam refresh should hit 429)"
```

---

## Testing Checklist

- [ ] TenantDO loads config from D1 on first request
- [ ] Config is cached for subsequent requests (no D1 hit)
- [ ] Config refreshes after 5 minutes
- [ ] Rate limiting kicks in after 60 requests/minute
- [ ] Analytics events are buffered in DO
- [ ] Analytics flush to D1 every 60 seconds
- [ ] Cache invalidation works after settings change
- [ ] Fallback to D1 works if DO binding unavailable

---

## Rollback Plan

If issues occur after deployment:

1. **Quick rollback:** Remove the TenantDO code from hooks.server.ts, redeploy
2. **Data is safe:** D1 remains source of truth, no data loss
3. **Analytics buffer:** Events in DO buffer will be lost on rollback (acceptable)

---

## Success Metrics

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| D1 reads per request | 1-2 | 0 (cached) |
| Config load latency | ~50ms | <1ms (cached) |
| Rate limiting | IP-based only | Per-tenant |
| Analytics D1 writes | 1 per event | ~1 per 60s batch |

---

*Created: 2025-12-26*
