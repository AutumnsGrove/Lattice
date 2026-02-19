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
 *
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";
import { DEFAULT_TIER, type TierKey } from "./tiers.js";

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

/** Alarm interval: 1 hour */
const ALARM_INTERVAL_MS = 60 * 60 * 1000;

/** Presence timeout: 5 minutes */
const PRESENCE_TIMEOUT_MS = 5 * 60 * 1000;

/** View dedup window: 5 minutes per session */
const VIEW_DEDUP_MS = 5 * 60 * 1000;

/** Dirty-flag persist throttle: 60 seconds */
const PERSIST_THROTTLE_MS = 60_000;

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

interface WSMessage extends Record<string, unknown> {
	type: "reaction" | "presence" | "view";
	data: unknown;
}

interface MetaEnv extends Record<string, unknown> {
	DB: D1Database;
}

// ============================================================================
// PostMetaDO Class
// ============================================================================

export class PostMetaDO extends LoomDO<PostMeta, MetaEnv> {
	private presence: Map<string, number> = new Map();

	// Track view inserts for inline growth check
	private viewInsertsSinceCheck: number = 0;

	config(): LoomConfig {
		return { name: "PostMetaDO" };
	}

	protected schema(): string {
		return `
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
    `;
	}

	protected async loadState(): Promise<PostMeta | null> {
		const stored = this.sql.queryOne<{ value: string }>(
			"SELECT value FROM meta WHERE key = 'post_meta'",
		);
		if (!stored?.value) return null;
		return JSON.parse(stored.value);
	}

	routes(): LoomRoute[] {
		return [
			{ method: "GET", path: "/meta", handler: () => this.handleGetMeta() },
			{
				method: "POST",
				path: "/meta/init",
				handler: (ctx) => this.handleInitMeta(ctx),
			},
			{
				method: "POST",
				path: "/view",
				handler: (ctx) => this.handleRecordView(ctx),
			},
			{
				method: "GET",
				path: "/reactions",
				handler: () => this.handleGetReactions(),
			},
			{
				method: "POST",
				path: "/reactions",
				handler: (ctx) => this.handleAddReaction(ctx),
			},
			{
				method: "DELETE",
				path: "/reactions",
				handler: (ctx) => this.handleRemoveReaction(ctx),
			},
			{
				method: "GET",
				path: "/presence",
				handler: () => this.handleGetPresence(),
			},
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Custom fetch override — WebSocket upgrade needs special handling
	// ════════════════════════════════════════════════════════════════════

	async fetch(request: Request): Promise<Response> {
		// WebSocket upgrade bypasses normal routing
		if (request.headers.get("Upgrade") === "websocket") {
			return this.handleWebSocket();
		}
		return super.fetch(request);
	}

	// ════════════════════════════════════════════════════════════════════
	// Route Handlers
	// ════════════════════════════════════════════════════════════════════

	private async handleGetMeta(): Promise<Response> {
		if (!this.state_data) {
			return new Response("Post not initialized", { status: 404 });
		}
		return Response.json(this.state_data);
	}

	private async handleInitMeta(ctx: LoomRequestContext): Promise<Response> {
		const data = (await ctx.request.json()) as {
			tenantId: string;
			slug: string;
			tier?: TierKey;
		};

		if (!data.tenantId || !data.slug) {
			return new Response("Missing tenantId or slug", { status: 400 });
		}

		if (!this.state_data) {
			this.state_data = {
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
			await this.alarms.ensureScheduled(ALARM_INTERVAL_MS);
		} else if (data.tier && this.state_data.tier !== data.tier) {
			// Update tier if it changed (e.g., tenant upgraded)
			this.state_data.tier = data.tier;
			this.updatePopularStatus(); // Recalculate with new threshold
			await this.persistMeta();
		}

		return Response.json({ success: true, meta: this.state_data });
	}

	private async handleRecordView(ctx: LoomRequestContext): Promise<Response> {
		const data = (await ctx.request.json()) as { sessionId?: string };

		if (!this.state_data) {
			return new Response("Post not initialized", { status: 400 });
		}

		const now = Date.now();
		const sessionKey = data.sessionId || "anonymous";
		const lastView = this.presence.get(sessionKey) || 0;

		if (now - lastView > VIEW_DEDUP_MS) {
			this.state_data.viewCount++;
			this.state_data.lastViewed = now;
			this.presence.set(sessionKey, now);
			this.markDirty();

			this.sql.exec("INSERT INTO view_log (timestamp, session_id) VALUES (?, ?)", now, sessionKey);

			// Inline growth check - prevents unbounded growth between alarms
			this.viewInsertsSinceCheck++;
			if (this.viewInsertsSinceCheck >= VIEW_LOG_CHECK_INTERVAL) {
				this.trimViewLogIfNeeded();
				this.viewInsertsSinceCheck = 0;
			}

			this.updatePopularStatus();
			this.broadcastMessage({
				type: "view",
				data: { viewCount: this.state_data.viewCount },
			});

			await this.persistIfDirty(PERSIST_THROTTLE_MS);
		}

		return Response.json({
			success: true,
			viewCount: this.state_data.viewCount,
		});
	}

	private async handleGetReactions(): Promise<Response> {
		if (!this.state_data) {
			return new Response("Post not initialized", { status: 404 });
		}
		return Response.json(this.state_data.reactions);
	}

	private async handleAddReaction(ctx: LoomRequestContext): Promise<Response> {
		const data = (await ctx.request.json()) as ReactionEvent;

		if (!this.state_data) {
			return new Response("Post not initialized", { status: 400 });
		}

		if (!data.type || !["like", "bookmark"].includes(data.type)) {
			return new Response("Invalid reaction type", { status: 400 });
		}

		const userId = data.userId || "anonymous";
		const now = Date.now();

		const existing = this.sql
			.exec("SELECT 1 FROM reactions WHERE user_id = ? AND reaction_type = ?", userId, data.type)
			.one();

		if (existing) {
			return Response.json({
				success: false,
				message: "Already reacted",
				reactions: this.state_data.reactions,
			});
		}

		this.sql.exec(
			"INSERT INTO reactions (user_id, reaction_type, created_at) VALUES (?, ?, ?)",
			userId,
			data.type,
			now,
		);

		if (data.type === "like") {
			this.state_data.reactions.likes++;
		} else if (data.type === "bookmark") {
			this.state_data.reactions.bookmarks++;
		}

		this.markDirty();
		this.updatePopularStatus();
		this.broadcastMessage({
			type: "reaction",
			data: { reactions: this.state_data.reactions },
		});
		await this.persistMeta();

		return Response.json({
			success: true,
			reactions: this.state_data.reactions,
		});
	}

	private async handleRemoveReaction(ctx: LoomRequestContext): Promise<Response> {
		const data = (await ctx.request.json()) as ReactionEvent;

		if (!this.state_data) {
			return new Response("Post not initialized", { status: 400 });
		}

		if (!data.type || !["like", "bookmark"].includes(data.type)) {
			return new Response("Invalid reaction type", { status: 400 });
		}

		const userId = data.userId || "anonymous";

		this.sql.exec(
			"DELETE FROM reactions WHERE user_id = ? AND reaction_type = ?",
			userId,
			data.type,
		);

		if (data.type === "like") {
			this.state_data.reactions.likes = Math.max(0, this.state_data.reactions.likes - 1);
		} else if (data.type === "bookmark") {
			this.state_data.reactions.bookmarks = Math.max(0, this.state_data.reactions.bookmarks - 1);
		}

		this.markDirty();
		this.broadcastMessage({
			type: "reaction",
			data: { reactions: this.state_data.reactions },
		});
		await this.persistMeta();

		return Response.json({
			success: true,
			reactions: this.state_data.reactions,
		});
	}

	private handleGetPresence(): Response {
		const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
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

	// ════════════════════════════════════════════════════════════════════
	// WebSocket Handling
	// ════════════════════════════════════════════════════════════════════

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
	 */
	private handleWebSocket(): Response {
		const response = this.sockets.accept(
			new Request("http://internal/ws", {
				headers: { Upgrade: "websocket" },
			}),
		);

		// Send initial state to the new connection
		if (this.state_data) {
			const connections = this.sockets.getConnections();
			const newest = connections[connections.length - 1];
			if (newest) {
				try {
					newest.send(
						JSON.stringify({
							type: "init",
							data: {
								meta: this.state_data,
								presence: { activeReaders: this.sockets.connectionCount },
							},
						}),
					);
				} catch {
					// Connection may have closed immediately
				}
			}
		}

		return response;
	}

	protected async onWebSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		const msg = JSON.parse(message.toString()) as WSMessage;

		if (msg.type === "presence") {
			const data = msg.data as { sessionId?: string };
			if (data.sessionId) {
				this.presence.set(data.sessionId, Date.now());
			}
			this.broadcastMessage({
				type: "presence",
				data: { activeReaders: this.sockets.connectionCount },
			});
		}
	}

	protected async onWebSocketClose(): Promise<void> {
		this.broadcastMessage({
			type: "presence",
			data: { activeReaders: this.sockets.connectionCount },
		});
	}

	private broadcastMessage(message: WSMessage): void {
		this.sockets.broadcast(message);
	}

	// ════════════════════════════════════════════════════════════════════
	// Alarm Handler
	// ════════════════════════════════════════════════════════════════════

	protected async onAlarm(): Promise<void> {
		// Flush any dirty state
		if (this.state_data) {
			await this.persistIfDirty();
		}

		// Clean up view_log: remove entries older than 7 days
		const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
		this.sql.exec("DELETE FROM view_log WHERE timestamp < ?", cutoff);

		// Enforce max row limit
		this.trimViewLogIfNeeded();

		// Clean up stale presence entries
		const presenceCutoff = Date.now() - PRESENCE_TIMEOUT_MS;
		for (const [sessionId, lastSeen] of this.presence) {
			if (lastSeen < presenceCutoff) {
				this.presence.delete(sessionId);
			}
		}

		// Reschedule
		await this.alarms.schedule(ALARM_INTERVAL_MS);
	}

	// ════════════════════════════════════════════════════════════════════
	// Persistence
	// ════════════════════════════════════════════════════════════════════

	protected async persistState(): Promise<void> {
		await this.persistMeta();
	}

	private async persistMeta(): Promise<void> {
		if (!this.state_data) return;

		this.sql.exec(
			"INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES (?, ?, ?)",
			"post_meta",
			JSON.stringify(this.state_data),
			Date.now(),
		);
	}

	// ════════════════════════════════════════════════════════════════════
	// Private Helpers
	// ════════════════════════════════════════════════════════════════════

	private updatePopularStatus(): void {
		if (!this.state_data) return;
		const dailyViews = this.calculateDailyViews();
		const threshold = getPopularThreshold(this.state_data.tier);
		this.state_data.isPopular = dailyViews >= threshold;
	}

	private calculateDailyViews(): number {
		const cutoff = Date.now() - 24 * 60 * 60 * 1000;
		const result = this.sql
			.exec("SELECT COUNT(*) as count FROM view_log WHERE timestamp > ?", cutoff)
			.one();
		return (result?.count as number) || 0;
	}

	/**
	 * Trim view_log if it exceeds MAX_VIEW_LOG_ROWS.
	 * Called both by alarm() (hourly) and inline during view recording (every 100 inserts).
	 * This dual approach prevents unbounded growth on viral posts.
	 */
	private trimViewLogIfNeeded(): void {
		const countResult = this.sql.exec("SELECT COUNT(*) as count FROM view_log").one();
		const rowCount = (countResult?.count as number) || 0;

		if (rowCount > MAX_VIEW_LOG_ROWS) {
			const deleteCount = rowCount - MAX_VIEW_LOG_ROWS;
			this.sql.exec(
				`DELETE FROM view_log WHERE id IN (
          SELECT id FROM view_log ORDER BY timestamp ASC LIMIT ?
        )`,
				deleteCount,
			);
			this.log.info(
				`Trimmed ${deleteCount} old view_log entries (was ${rowCount}, now ${MAX_VIEW_LOG_ROWS})`,
			);
		}
	}
}
