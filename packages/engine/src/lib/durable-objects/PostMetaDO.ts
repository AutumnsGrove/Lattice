/// <reference types="@cloudflare/workers-types" />

/**
 * PostMetaDO - Per-Post Durable Object for Hot Data
 *
 * Handles data that changes frequently and benefits from staying awake:
 * - Reaction counts (likes, bookmarks)
 * - View counts and analytics
 * - Real-time presence (who's reading)
 * - WebSocket connections for live updates
 *
 * ID Pattern: post:{tenantId}:{slug}
 *
 * Part of the Loom pattern - Grove's coordination layer.
 * Split from PostContentDO for optimal hibernation behavior.
 */

import { DEFAULT_TIER, type TierKey } from "../config/tiers.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Tier-based popular post thresholds
 *
 * Philosophy: Higher-tier tenants pay more, so they get lower thresholds
 * for "popular" status. This makes their posts more likely to show popular
 * indicators, which is a subtle perk of higher tiers.
 *
 * Values represent daily views required for "popular" status.
 */
const POPULAR_POST_THRESHOLDS: Record<TierKey, number> = {
  free: 150, // Highest bar (no blog anyway)
  seedling: 100, // Entry tier - standard threshold
  sapling: 75, // Growing tier - slightly easier
  oak: 50, // Premium tier - more posts become "popular"
  evergreen: 25, // Top tier - most permissive
};

/**
 * Get the popular post threshold for a tier, with fallback to DEFAULT_TIER
 */
function getPopularThreshold(tier: string | undefined): number {
  const key = tier as TierKey;
  return POPULAR_POST_THRESHOLDS[key] ?? POPULAR_POST_THRESHOLDS[DEFAULT_TIER];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum rows in view_log table to prevent unbounded growth.
 * For viral posts, we only need recent views for popular status calculation.
 * Older views are aggregated into viewCount and don't need individual tracking.
 */
const MAX_VIEW_LOG_ROWS = 50_000;

/**
 * Check view log growth every N inserts.
 * This prevents unbounded growth between hourly alarms for viral posts.
 */
const VIEW_LOG_CHECK_INTERVAL = 100;

export interface PostMeta {
  tenantId: string;
  slug: string;
  tier?: TierKey; // Tenant's subscription tier (for threshold calculation)
  viewCount: number;
  reactions: ReactionCounts;
  lastViewed: number;
  isPopular: boolean;
}

export interface ReactionCounts {
  likes: number;
  bookmarks: number;
}

export interface ReactionEvent {
  type: "like" | "bookmark";
  action: "add" | "remove";
  userId?: string;
  timestamp: number;
}

export interface PresenceInfo {
  activeReaders: number;
  lastActivity: number;
}

interface WSMessage {
  type: "reaction" | "presence" | "view";
  data: unknown;
}

// ============================================================================
// PostMetaDO Class
// ============================================================================

export class PostMetaDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  private meta: PostMeta | null = null;
  private presence: Map<string, number> = new Map();
  private connections: Set<WebSocket> = new Set();
  private initialized: boolean = false;

  private isDirty: boolean = false;
  private lastPersist: number = 0;

  // Track view inserts for inline growth check
  private viewInsertsSinceCheck: number = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    this.state.blockConcurrencyWhile(async () => {
      await this.initializeStorage();
    });
  }

  private async initializeStorage(): Promise<void> {
    if (this.initialized) return;

    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reactions (
        user_id TEXT NOT NULL,
        reaction_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, reaction_type)
      );

      CREATE TABLE IF NOT EXISTS view_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        session_id TEXT
      );
    `);

    const stored = this.state.storage.sql
      .exec("SELECT value FROM meta WHERE key = 'post_meta'")
      .one();

    if (stored?.value) {
      this.meta = JSON.parse(stored.value as string);
    }

    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.headers.get("Upgrade") === "websocket") {
        return this.handleWebSocket();
      }

      if (path === "/meta" && request.method === "GET") {
        return this.handleGetMeta();
      }

      if (path === "/meta/init" && request.method === "POST") {
        return this.handleInitMeta(request);
      }

      if (path === "/view" && request.method === "POST") {
        return this.handleRecordView(request);
      }

      if (path === "/reactions" && request.method === "GET") {
        return this.handleGetReactions();
      }

      if (path === "/reactions" && request.method === "POST") {
        return this.handleAddReaction(request);
      }

      if (path === "/reactions" && request.method === "DELETE") {
        return this.handleRemoveReaction(request);
      }

      if (path === "/presence" && request.method === "GET") {
        return this.handleGetPresence();
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("[PostMetaDO] Error:", err);
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  private async handleGetMeta(): Promise<Response> {
    if (!this.meta) {
      return new Response("Post not initialized", { status: 404 });
    }
    return Response.json(this.meta);
  }

  private async handleInitMeta(request: Request): Promise<Response> {
    const data = (await request.json()) as {
      tenantId: string;
      slug: string;
      tier?: TierKey; // Optional tier for popular threshold calculation
    };

    if (!data.tenantId || !data.slug) {
      return new Response("Missing tenantId or slug", { status: 400 });
    }

    if (!this.meta) {
      this.meta = {
        tenantId: data.tenantId,
        slug: data.slug,
        tier: data.tier,
        viewCount: 0,
        reactions: { likes: 0, bookmarks: 0 },
        lastViewed: Date.now(),
        isPopular: false,
      };
      await this.persistMeta();

      // Schedule initial cleanup alarm (with dedup check)
      await this.ensureAlarmScheduled();
    } else if (data.tier && this.meta.tier !== data.tier) {
      // Update tier if it changed (e.g., tenant upgraded)
      this.meta.tier = data.tier;
      this.updatePopularStatus(); // Recalculate with new threshold
      await this.persistMeta();
    }

    return Response.json({ success: true, meta: this.meta });
  }

  private async handleRecordView(request: Request): Promise<Response> {
    const data = (await request.json()) as { sessionId?: string };

    if (!this.meta) {
      return new Response("Post not initialized", { status: 400 });
    }

    const now = Date.now();
    const sessionKey = data.sessionId || "anonymous";
    const lastView = this.presence.get(sessionKey) || 0;

    if (now - lastView > 5 * 60 * 1000) {
      this.meta.viewCount++;
      this.meta.lastViewed = now;
      this.presence.set(sessionKey, now);
      this.isDirty = true;

      await this.state.storage.sql.exec(
        "INSERT INTO view_log (timestamp, session_id) VALUES (?, ?)",
        now,
        sessionKey,
      );

      // Inline growth check - prevents unbounded growth between alarms
      this.viewInsertsSinceCheck++;
      if (this.viewInsertsSinceCheck >= VIEW_LOG_CHECK_INTERVAL) {
        await this.trimViewLogIfNeeded();
        this.viewInsertsSinceCheck = 0;
      }

      this.updatePopularStatus();
      this.broadcast({
        type: "view",
        data: { viewCount: this.meta.viewCount },
      });

      if (this.isDirty && now - this.lastPersist > 60_000) {
        await this.persistMeta();
      }
    }

    return Response.json({ success: true, viewCount: this.meta.viewCount });
  }

  private async handleGetReactions(): Promise<Response> {
    if (!this.meta) {
      return new Response("Post not initialized", { status: 404 });
    }
    return Response.json(this.meta.reactions);
  }

  private async handleAddReaction(request: Request): Promise<Response> {
    const data = (await request.json()) as ReactionEvent;

    if (!this.meta) {
      return new Response("Post not initialized", { status: 400 });
    }

    if (!data.type || !["like", "bookmark"].includes(data.type)) {
      return new Response("Invalid reaction type", { status: 400 });
    }

    const userId = data.userId || "anonymous";
    const now = Date.now();

    const existing = this.state.storage.sql
      .exec(
        "SELECT 1 FROM reactions WHERE user_id = ? AND reaction_type = ?",
        userId,
        data.type,
      )
      .one();

    if (existing) {
      return Response.json({
        success: false,
        message: "Already reacted",
        reactions: this.meta.reactions,
      });
    }

    await this.state.storage.sql.exec(
      "INSERT INTO reactions (user_id, reaction_type, created_at) VALUES (?, ?, ?)",
      userId,
      data.type,
      now,
    );

    if (data.type === "like") {
      this.meta.reactions.likes++;
    } else if (data.type === "bookmark") {
      this.meta.reactions.bookmarks++;
    }

    this.isDirty = true;
    this.updatePopularStatus();
    this.broadcast({
      type: "reaction",
      data: { reactions: this.meta.reactions },
    });
    await this.persistMeta();

    return Response.json({ success: true, reactions: this.meta.reactions });
  }

  private async handleRemoveReaction(request: Request): Promise<Response> {
    const data = (await request.json()) as ReactionEvent;

    if (!this.meta) {
      return new Response("Post not initialized", { status: 400 });
    }

    if (!data.type || !["like", "bookmark"].includes(data.type)) {
      return new Response("Invalid reaction type", { status: 400 });
    }

    const userId = data.userId || "anonymous";

    await this.state.storage.sql.exec(
      "DELETE FROM reactions WHERE user_id = ? AND reaction_type = ?",
      userId,
      data.type,
    );

    if (data.type === "like") {
      this.meta.reactions.likes = Math.max(0, this.meta.reactions.likes - 1);
    } else if (data.type === "bookmark") {
      this.meta.reactions.bookmarks = Math.max(
        0,
        this.meta.reactions.bookmarks - 1,
      );
    }

    this.isDirty = true;
    this.broadcast({
      type: "reaction",
      data: { reactions: this.meta.reactions },
    });
    await this.persistMeta();

    return Response.json({ success: true, reactions: this.meta.reactions });
  }

  private async handleGetPresence(): Promise<Response> {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [sessionId, lastSeen] of this.presence) {
      if (lastSeen < cutoff) {
        this.presence.delete(sessionId);
      }
    }

    const presence: PresenceInfo = {
      activeReaders: this.presence.size,
      lastActivity: Math.max(...this.presence.values(), 0),
    };

    return Response.json(presence);
  }

  /**
   * Handle WebSocket connection for real-time presence updates.
   *
   * SECURITY NOTE: Anonymous WebSocket access is intentional.
   * This endpoint provides read-only presence data ("N people reading")
   * which is public information suitable for any blog visitor. The data
   * exposed (reader count, reaction counts) is already visible on the
   * public blog page. No authentication is required because:
   * - No sensitive data is transmitted
   * - No state-changing operations are available via WebSocket
   * - Presence tracking uses anonymous session IDs, not user identities
   *
   * If private analytics are needed in the future, that would go through
   * authenticated API endpoints, not this WebSocket.
   */
  private handleWebSocket(): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    this.connections.add(server);

    if (this.meta) {
      server.send(
        JSON.stringify({
          type: "init",
          data: {
            meta: this.meta,
            presence: { activeReaders: this.connections.size },
          },
        }),
      );
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    try {
      const msg = JSON.parse(message.toString()) as WSMessage;

      if (msg.type === "presence") {
        const data = msg.data as { sessionId?: string };
        if (data.sessionId) {
          this.presence.set(data.sessionId, Date.now());
        }
        this.broadcast({
          type: "presence",
          data: { activeReaders: this.connections.size },
        });
      }
    } catch (err) {
      console.error("[PostMetaDO] WebSocket message error:", err);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.connections.delete(ws);
    this.broadcast({
      type: "presence",
      data: { activeReaders: this.connections.size },
    });
  }

  private broadcast(message: WSMessage): void {
    const payload = JSON.stringify(message);
    for (const ws of this.connections) {
      try {
        ws.send(payload);
      } catch (err) {
        // Log WebSocket errors for debugging instead of silent swallow
        console.debug(
          "[PostMetaDO] WebSocket send failed, removing connection:",
          err instanceof Error ? err.message : "Unknown error",
        );
        this.connections.delete(ws);
      }
    }
  }

  private async persistMeta(): Promise<void> {
    if (!this.meta) return;

    await this.state.storage.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES (?, ?, ?)",
      "post_meta",
      JSON.stringify(this.meta),
      Date.now(),
    );

    this.isDirty = false;
    this.lastPersist = Date.now();
  }

  private updatePopularStatus(): void {
    if (!this.meta) return;
    const dailyViews = this.calculateDailyViews();
    const threshold = getPopularThreshold(this.meta.tier);
    this.meta.isPopular = dailyViews >= threshold;
  }

  private calculateDailyViews(): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const result = this.state.storage.sql
      .exec(
        "SELECT COUNT(*) as count FROM view_log WHERE timestamp > ?",
        cutoff,
      )
      .one();
    return (result?.count as number) || 0;
  }

  /**
   * Ensure an alarm is scheduled (with deduplication).
   * Prevents redundant setAlarm() calls which waste resources.
   */
  private async ensureAlarmScheduled(): Promise<void> {
    const currentAlarm = await this.state.storage.getAlarm();
    if (!currentAlarm) {
      // Schedule cleanup alarm for 1 hour from now
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }
    // If alarm already exists, don't reschedule (dedup)
  }

  /**
   * Trim view_log if it exceeds MAX_VIEW_LOG_ROWS.
   * Called both by alarm() (hourly) and inline during view recording (every 100 inserts).
   * This dual approach prevents unbounded growth on viral posts.
   */
  private async trimViewLogIfNeeded(): Promise<void> {
    const countResult = this.state.storage.sql
      .exec("SELECT COUNT(*) as count FROM view_log")
      .one();
    const rowCount = (countResult?.count as number) || 0;

    if (rowCount > MAX_VIEW_LOG_ROWS) {
      const deleteCount = rowCount - MAX_VIEW_LOG_ROWS;
      await this.state.storage.sql.exec(
        `DELETE FROM view_log WHERE id IN (
          SELECT id FROM view_log ORDER BY timestamp ASC LIMIT ?
        )`,
        deleteCount,
      );
      console.log(
        `[PostMetaDO] Trimmed ${deleteCount} old view_log entries (was ${rowCount}, now ${MAX_VIEW_LOG_ROWS})`,
      );
    }
  }

  async alarm(): Promise<void> {
    if (this.isDirty) {
      await this.persistMeta();
    }

    // Clean up view_log: remove entries older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await this.state.storage.sql.exec(
      "DELETE FROM view_log WHERE timestamp < ?",
      cutoff,
    );

    // Enforce max row limit (uses shared helper)
    await this.trimViewLogIfNeeded();

    // Clean up stale presence entries
    const presenceCutoff = Date.now() - 5 * 60 * 1000;
    for (const [sessionId, lastSeen] of this.presence) {
      if (lastSeen < presenceCutoff) {
        this.presence.delete(sessionId);
      }
    }

    await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }
}

interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
}
