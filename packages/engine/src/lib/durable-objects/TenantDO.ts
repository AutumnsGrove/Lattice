/// <reference types="@cloudflare/workers-types" />

/**
 * TenantDO - Per-Tenant Durable Object
 *
 * Provides:
 * - Config caching (eliminates D1 reads on every request)
 * - Cross-device draft sync
 * - Analytics event buffering
 *
 * ID Pattern: tenant:{subdomain}
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

import { TIERS, type TierKey, type PaidTierKey } from "../config/tiers.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum analytics events to buffer before forcing a flush.
 * Prevents memory leak if alarm mechanism fails.
 */
const MAX_ANALYTICS_BUFFER = 1000;

// ============================================================================
// Types
// ============================================================================

export interface TenantConfig {
  id: string; // Tenant UUID from D1 - cached to avoid repeated lookups
  subdomain: string;
  displayName: string;
  theme: Record<string, unknown> | null;
  tier: PaidTierKey; // Uses centralized type from tiers.ts (excludes 'free' since tenants are paying)
  limits: TierLimits;
  ownerId: string;
}

export interface TierLimits {
  postsPerMonth: number;
  storageBytes: number;
  customDomains: number;
}

export interface Draft {
  slug: string;
  content: string;
  metadata: DraftMetadata;
  lastSaved: number;
  deviceId: string;
}

export interface DraftMetadata {
  title: string;
  description?: string;
  tags?: string[];
}

export interface AnalyticsEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// TenantDO Class
// ============================================================================

export class TenantDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  // In-memory caches (faster than storage for hot data)
  private config: TenantConfig | null = null;
  private configLoadedAt: number = 0;
  private analyticsBuffer: AnalyticsEvent[] = [];
  private initialized: boolean = false;

  // Race condition prevention: only one refresh at a time
  private refreshPromise: Promise<void> | null = null;

  // Subdomain extracted from DO name (set on first request)
  private subdomain: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Block concurrent requests while initializing storage
    this.state.blockConcurrencyWhile(async () => {
      await this.initializeStorage();
    });
  }

  /**
   * Initialize SQLite tables in DO storage
   */
  private async initializeStorage(): Promise<void> {
    if (this.initialized) return;

    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS drafts (
        slug TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        last_saved INTEGER NOT NULL,
        device_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp INTEGER NOT NULL
      );
    `);

    this.initialized = true;
  }

  /**
   * Main request handler - routes to appropriate method
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Extract subdomain from request header (set by hooks.server.ts)
    // This is passed on every request to ensure we always know our identity
    const subdomainHeader = request.headers.get("X-Tenant-Subdomain");
    if (subdomainHeader && !this.subdomain) {
      this.subdomain = subdomainHeader;
    }

    try {
      // Config endpoints
      if (path === "/config" && request.method === "GET") {
        return this.handleGetConfig();
      }

      if (path === "/config" && request.method === "PUT") {
        return this.handleUpdateConfig(request);
      }

      // Draft endpoints
      if (path === "/drafts" && request.method === "GET") {
        return this.handleListDrafts();
      }

      if (path.startsWith("/drafts/") && request.method === "GET") {
        const slug = path.split("/").pop();
        return this.handleGetDraft(slug!);
      }

      if (path.startsWith("/drafts/") && request.method === "PUT") {
        const slug = path.split("/").pop();
        return this.handleSaveDraft(slug!, request);
      }

      if (path.startsWith("/drafts/") && request.method === "DELETE") {
        const slug = path.split("/").pop();
        return this.handleDeleteDraft(slug!);
      }

      // Analytics endpoint
      if (path === "/analytics" && request.method === "POST") {
        return this.handleRecordEvent(request);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("[TenantDO] Error:", err);
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ============================================================================
  // Config Methods
  // ============================================================================

  /**
   * Get tenant config (cached in memory, refreshed from D1 if stale)
   *
   * Uses a promise lock pattern to prevent race conditions where multiple
   * concurrent requests all trigger D1 queries simultaneously.
   */
  private async handleGetConfig(): Promise<Response> {
    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    // Refresh if stale or not loaded (with race condition prevention)
    if (!this.config || Date.now() - this.configLoadedAt > STALE_THRESHOLD_MS) {
      // Only start one refresh at a time - other requests wait for it
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshConfig().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;
    }

    if (!this.config) {
      return new Response("Tenant not found", { status: 404 });
    }

    return Response.json(this.config);
  }

  /**
   * Refresh config from DO storage or D1
   *
   * This method caches the tenant ID in the config to avoid repeated D1 lookups
   * in hooks.server.ts. The ID is stored alongside other config data.
   */
  private async refreshConfig(): Promise<void> {
    // Try DO storage first (fastest)
    const stored = this.state.storage.sql
      .exec("SELECT value FROM config WHERE key = 'tenant_config'")
      .one();

    if (stored?.value) {
      try {
        this.config = JSON.parse(stored.value as string);
        // Also set subdomain from cached config if we don't have it
        if (this.config?.subdomain && !this.subdomain) {
          this.subdomain = this.config.subdomain;
        }
        this.configLoadedAt = Date.now();
        return;
      } catch (err) {
        // Corrupted cache - clear it and fall through to D1
        console.warn(
          "[TenantDO] Failed to parse cached config, clearing:",
          err instanceof Error ? err.message : err,
        );
        await this.state.storage.sql.exec(
          "DELETE FROM config WHERE key = 'tenant_config'",
        );
      }
    }

    // Fall back to D1 - need subdomain to query
    const subdomain = this.getSubdomain();
    if (!subdomain) {
      console.error("[TenantDO] Cannot refresh config: no subdomain available");
      return;
    }

    // Query D1 for full tenant data including ID
    const row = await this.env.DB.prepare(
      `
      SELECT id, subdomain, name as displayName, theme, plan as tier, owner_id as ownerId
      FROM tenants
      WHERE subdomain = ? AND active = 1
    `,
    )
      .bind(subdomain)
      .first();

    if (row) {
      // Build config with tier limits from centralized tiers.ts
      const tier = (row.tier as TenantConfig["tier"]) || "seedling";

      // Safely parse theme JSON (corrupted data shouldn't crash the DO)
      let theme: Record<string, unknown> | null = null;
      if (row.theme) {
        try {
          theme = JSON.parse(row.theme as string);
        } catch (err) {
          console.warn(
            `[TenantDO] Failed to parse theme JSON for ${this.subdomain}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      this.config = {
        id: row.id as string, // Include tenant ID to eliminate hooks.server.ts D1 query
        subdomain: row.subdomain as string,
        displayName: row.displayName as string,
        theme,
        tier,
        ownerId: row.ownerId as string,
        limits: this.getTierLimits(tier),
      };

      // Cache in DO storage for next time
      await this.state.storage.sql.exec(
        "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
        "tenant_config",
        JSON.stringify(this.config),
        Date.now(),
      );

      this.configLoadedAt = Date.now();
    }
  }

  /**
   * Update tenant config
   *
   * Uses the same promise lock pattern as handleGetConfig to prevent
   * race conditions where concurrent updates could clobber each other.
   */
  private async handleUpdateConfig(request: Request): Promise<Response> {
    const updates = (await request.json()) as Partial<TenantConfig>;

    // Ensure config is loaded with race condition prevention
    if (!this.config) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshConfig().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;
    }

    if (!this.config) {
      return new Response("Tenant not found", { status: 404 });
    }

    this.config = { ...this.config, ...updates };

    // Update DO storage
    await this.state.storage.sql.exec(
      "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
      "tenant_config",
      JSON.stringify(this.config),
      Date.now(),
    );

    // Update D1 (source of truth) using the subdomain
    const subdomain = this.getSubdomain();
    if (subdomain) {
      await this.env.DB.prepare(
        `
        UPDATE tenants
        SET name = ?, theme = ?, updated_at = datetime('now')
        WHERE subdomain = ?
      `,
      )
        .bind(
          this.config.displayName,
          this.config.theme ? JSON.stringify(this.config.theme) : null,
          subdomain,
        )
        .run();
    }

    this.configLoadedAt = Date.now();

    return Response.json({ success: true });
  }

  /**
   * Get tier limits from centralized tiers.ts config
   *
   * This ensures TenantDO limits match the single source of truth,
   * preventing drift between DO cached limits and actual tier configuration.
   */
  private getTierLimits(tier: TenantConfig["tier"]): TierLimits {
    // Map TenantConfig tier to TierKey (they're compatible)
    const tierConfig = TIERS[tier as TierKey] ?? TIERS.seedling;

    return {
      // Convert Infinity to -1 for JSON serialization (Infinity isn't valid JSON)
      postsPerMonth:
        tierConfig.limits.posts === Infinity ? -1 : tierConfig.limits.posts,
      storageBytes: tierConfig.limits.storage,
      // Custom domains based on tier features
      customDomains: tierConfig.features.customDomain
        ? tier === "evergreen"
          ? 10
          : tier === "oak"
            ? 3
            : 1
        : 0,
    };
  }

  // ============================================================================
  // Draft Methods
  // ============================================================================

  /**
   * List all drafts for this tenant
   */
  private async handleListDrafts(): Promise<Response> {
    const rows = this.state.storage.sql
      .exec(
        "SELECT slug, metadata, last_saved, device_id FROM drafts ORDER BY last_saved DESC",
      )
      .toArray();

    const drafts = rows.map((row) => {
      let metadata: DraftMetadata = { title: "Untitled" };
      try {
        metadata = JSON.parse(row.metadata as string);
      } catch (err) {
        console.warn(
          `[TenantDO] Failed to parse draft metadata for ${row.slug}:`,
          err instanceof Error ? err.message : err,
        );
      }
      return {
        slug: row.slug,
        metadata,
        lastSaved: row.last_saved,
        deviceId: row.device_id,
      };
    });

    return Response.json(drafts);
  }

  /**
   * Get a specific draft
   */
  private async handleGetDraft(slug: string): Promise<Response> {
    const row = this.state.storage.sql
      .exec("SELECT * FROM drafts WHERE slug = ?", slug)
      .one();

    if (!row) {
      return new Response("Draft not found", { status: 404 });
    }

    let metadata: DraftMetadata = { title: "Untitled" };
    try {
      metadata = JSON.parse(row.metadata as string);
    } catch (err) {
      console.warn(
        `[TenantDO] Failed to parse draft metadata for ${slug}:`,
        err instanceof Error ? err.message : err,
      );
    }

    return Response.json({
      slug: row.slug,
      content: row.content,
      metadata,
      lastSaved: row.last_saved,
      deviceId: row.device_id,
    });
  }

  /**
   * Save or update a draft
   */
  private async handleSaveDraft(
    slug: string,
    request: Request,
  ): Promise<Response> {
    const draft = (await request.json()) as Omit<Draft, "slug" | "lastSaved">;
    const now = Date.now();

    await this.state.storage.sql.exec(
      `
      INSERT OR REPLACE INTO drafts (slug, content, metadata, last_saved, device_id)
      VALUES (?, ?, ?, ?, ?)
    `,
      slug,
      draft.content,
      JSON.stringify(draft.metadata),
      now,
      draft.deviceId,
    );

    return Response.json({ success: true, lastSaved: now });
  }

  /**
   * Delete a draft
   */
  private async handleDeleteDraft(slug: string): Promise<Response> {
    await this.state.storage.sql.exec(
      "DELETE FROM drafts WHERE slug = ?",
      slug,
    );
    return Response.json({ success: true });
  }

  // ============================================================================
  // Analytics Methods
  // ============================================================================

  /**
   * Record an analytics event (buffered)
   */
  private async handleRecordEvent(request: Request): Promise<Response> {
    const event = (await request.json()) as AnalyticsEvent;

    // Add to memory buffer
    this.analyticsBuffer.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });

    // Flush conditions:
    // 1. Normal threshold (100): flush and let alarm reschedule
    // 2. MAX_ANALYTICS_BUFFER: safety net if alarm mechanism fails
    if (this.analyticsBuffer.length >= MAX_ANALYTICS_BUFFER) {
      // Force flush - buffer is dangerously large
      console.warn(
        `[TenantDO] Analytics buffer hit max (${MAX_ANALYTICS_BUFFER}), forcing flush`,
      );
      await this.flushAnalytics();
    } else if (this.analyticsBuffer.length >= 100) {
      // Normal flush threshold
      await this.flushAnalytics();
    } else {
      // Schedule flush via alarm if not already set
      const currentAlarm = await this.state.storage.getAlarm();
      if (!currentAlarm) {
        await this.state.storage.setAlarm(Date.now() + 60_000); // 1 minute
      }
    }

    return Response.json({ success: true });
  }

  /**
   * Alarm handler - flush analytics buffer
   */
  async alarm(): Promise<void> {
    await this.flushAnalytics();
  }

  /**
   * Flush analytics buffer to D1
   */
  private async flushAnalytics(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return;

    const events = this.analyticsBuffer.splice(0, this.analyticsBuffer.length);
    const subdomain = this.getSubdomain() || "unknown";

    // For now, just log - analytics table implementation deferred to Rings
    console.log(
      `[TenantDO] Flushing ${events.length} analytics events for ${subdomain}`,
    );

    // TODO: When Rings is implemented, batch insert to analytics table
    // This will use the AnalyticsDO pattern from the Rings spec
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get the subdomain for this tenant DO
   *
   * Priority:
   * 1. Subdomain passed via X-Tenant-Subdomain header (set on every request)
   * 2. Cached subdomain from previous request
   * 3. Subdomain from cached config
   *
   * Returns null if subdomain is not yet known (shouldn't happen in practice
   * since hooks.server.ts always sends the header).
   */
  private getSubdomain(): string | null {
    return this.subdomain || this.config?.subdomain || null;
  }

  /**
   * Get the tenant ID (UUID) for this tenant
   *
   * Returns the cached ID from config, or null if not yet loaded.
   * The ID is fetched from D1 on first config load and cached.
   */
  private getTenantId(): string | null {
    return this.config?.id || null;
  }
}

// ============================================================================
// Environment Type (for DO constructor)
// ============================================================================

interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
}
