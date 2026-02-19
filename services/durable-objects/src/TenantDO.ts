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
 *
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";
import { TIERS, type TierKey, type PaidTierKey } from "./tiers.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum analytics events to buffer before forcing a flush.
 * Prevents memory leak if alarm mechanism fails.
 */
const MAX_ANALYTICS_BUFFER = 1000;

/** Config staleness threshold: 5 minutes */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/** Analytics flush alarm delay: 1 minute */
const ANALYTICS_ALARM_MS = 60_000;

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

interface TenantEnv extends Record<string, unknown> {
	DB: D1Database;
}

// ============================================================================
// TenantDO Class
// ============================================================================

export class TenantDO extends LoomDO<TenantConfig, TenantEnv> {
	// In-memory caches (faster than storage for hot data)
	private configLoadedAt: number = 0;
	private analyticsBuffer: AnalyticsEvent[] = [];

	// Subdomain extracted from DO name (set on first request)
	private subdomain: string | null = null;

	config(): LoomConfig {
		return { name: "TenantDO" };
	}

	protected schema(): string {
		return `
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
    `;
	}

	protected async loadState(): Promise<TenantConfig | null> {
		// Use queryAll to avoid .one() throwing on empty table
		const rows = this.sql.queryAll<{ value: string }>(
			"SELECT value FROM config WHERE key = 'tenant_config'",
		);
		if (!rows.length || !rows[0].value) return null;
		try {
			return JSON.parse(rows[0].value);
		} catch {
			return null;
		}
	}

	routes(): LoomRoute[] {
		return [
			// Config endpoints
			{
				method: "GET",
				path: "/config",
				handler: () => this.handleGetConfig(),
			},
			{
				method: "PUT",
				path: "/config",
				handler: (ctx) => this.handleUpdateConfig(ctx),
			},
			// Draft endpoints
			{
				method: "GET",
				path: "/drafts",
				handler: () => this.handleListDrafts(),
			},
			{
				method: "GET",
				path: "/drafts/:slug",
				handler: (ctx) => this.handleGetDraft(ctx),
			},
			{
				method: "PUT",
				path: "/drafts/:slug",
				handler: (ctx) => this.handleSaveDraft(ctx),
			},
			{
				method: "DELETE",
				path: "/drafts/:slug",
				handler: (ctx) => this.handleDeleteDraft(ctx),
			},
			// Analytics endpoint
			{
				method: "POST",
				path: "/analytics",
				handler: (ctx) => this.handleRecordEvent(ctx),
			},
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Custom fetch override — extract subdomain header
	// ════════════════════════════════════════════════════════════════════

	async fetch(request: Request): Promise<Response> {
		// Extract subdomain from request header (set by hooks.server.ts)
		const subdomainHeader = request.headers.get("X-Tenant-Subdomain");
		if (subdomainHeader && !this.subdomain) {
			this.subdomain = subdomainHeader;
		}
		return super.fetch(request);
	}

	// ============================================================================
	// Config Methods
	// ============================================================================

	/**
	 * Get tenant config (cached in memory, refreshed from D1 if stale)
	 *
	 * Uses PromiseLockMap to prevent race conditions where multiple
	 * concurrent requests all trigger D1 queries simultaneously.
	 */
	private async handleGetConfig(): Promise<Response> {
		// Refresh if stale or not loaded (with race condition prevention via locks)
		if (!this.state_data || Date.now() - this.configLoadedAt > STALE_THRESHOLD_MS) {
			await this.locks.withLock("refresh", () => this.refreshConfig());
		}

		if (!this.state_data) {
			return new Response("Tenant not found", { status: 404 });
		}

		return Response.json(this.state_data);
	}

	/**
	 * Refresh config from DO storage or D1
	 *
	 * This method caches the tenant ID in the config to avoid repeated D1 lookups
	 * in hooks.server.ts. The ID is stored alongside other config data.
	 */
	private async refreshConfig(): Promise<void> {
		// Try DO storage first (fastest)
		const rows = this.sql.queryAll<{ value: string }>(
			"SELECT value FROM config WHERE key = 'tenant_config'",
		);

		if (rows.length > 0 && rows[0].value) {
			try {
				this.state_data = JSON.parse(rows[0].value);
				// Also set subdomain from cached config if we don't have it
				if (this.state_data?.subdomain && !this.subdomain) {
					this.subdomain = this.state_data.subdomain;
				}
				this.configLoadedAt = Date.now();
				return;
			} catch (err) {
				// Corrupted cache - clear it and fall through to D1
				this.log.warn(
					"Failed to parse cached config, clearing",
					err instanceof Error ? { error: err.message } : {},
				);
				this.sql.exec("DELETE FROM config WHERE key = 'tenant_config'");
			}
		}

		// Fall back to D1 - need subdomain to query
		const subdomain = this.getSubdomain();
		if (!subdomain) {
			this.log.error("Cannot refresh config: no subdomain available");
			return;
		}

		// Query D1 for full tenant data including ID
		const row = await this.env.DB.prepare(
			`
      SELECT id, subdomain, display_name as displayName, theme, plan as tier, email as ownerId
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
					this.log.warn(
						"Failed to parse theme JSON",
						err instanceof Error ? { error: err.message } : {},
					);
				}
			}

			this.state_data = {
				id: row.id as string,
				subdomain: row.subdomain as string,
				displayName: row.displayName as string,
				theme,
				tier,
				ownerId: row.ownerId as string,
				limits: this.getTierLimits(tier),
			};

			// Cache in DO storage for next time
			this.sql.exec(
				"INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
				"tenant_config",
				JSON.stringify(this.state_data),
				Date.now(),
			);

			this.configLoadedAt = Date.now();
		}
	}

	/**
	 * Update tenant config
	 */
	private async handleUpdateConfig(ctx: LoomRequestContext): Promise<Response> {
		const updates = (await ctx.request.json()) as Partial<TenantConfig>;

		// Ensure config is loaded with race condition prevention
		if (!this.state_data) {
			await this.locks.withLock("refresh", () => this.refreshConfig());
		}

		if (!this.state_data) {
			return new Response("Tenant not found", { status: 404 });
		}

		this.state_data = { ...this.state_data, ...updates };

		// Update DO storage
		this.sql.exec(
			"INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
			"tenant_config",
			JSON.stringify(this.state_data),
			Date.now(),
		);

		// Update D1 (source of truth) using the subdomain
		const subdomain = this.getSubdomain();
		if (subdomain) {
			await this.env.DB.prepare(
				`
        UPDATE tenants
        SET display_name = ?, theme = ?, updated_at = datetime('now')
        WHERE subdomain = ?
      `,
			)
				.bind(
					this.state_data.displayName,
					this.state_data.theme ? JSON.stringify(this.state_data.theme) : null,
					subdomain,
				)
				.run();
		}

		this.configLoadedAt = Date.now();

		return Response.json({ success: true });
	}

	/**
	 * Get tier limits from centralized tiers.ts config
	 */
	private getTierLimits(tier: TenantConfig["tier"]): TierLimits {
		const tierConfig = TIERS[tier as TierKey] ?? TIERS.seedling;

		return {
			// Convert Infinity to -1 for JSON serialization (Infinity isn't valid JSON)
			postsPerMonth: tierConfig.limits.posts === Infinity ? -1 : tierConfig.limits.posts,
			storageBytes: tierConfig.limits.storage,
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

	private async handleListDrafts(): Promise<Response> {
		const rows = this.sql.queryAll<{
			slug: string;
			metadata: string;
			last_saved: number;
			device_id: string;
		}>("SELECT slug, metadata, last_saved, device_id FROM drafts ORDER BY last_saved DESC");

		const drafts = rows.map((row) => {
			let metadata: DraftMetadata = { title: "Untitled" };
			try {
				metadata = JSON.parse(row.metadata as string);
			} catch (err) {
				this.log.warn(
					`Failed to parse draft metadata for ${row.slug}`,
					err instanceof Error ? { error: err.message } : {},
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

	private async handleGetDraft(ctx: LoomRequestContext): Promise<Response> {
		const { slug } = ctx.params;

		const row = this.sql.queryOne<{
			slug: string;
			content: string;
			metadata: string;
			last_saved: number;
			device_id: string;
		}>("SELECT * FROM drafts WHERE slug = ?", slug);

		if (!row) {
			return new Response("Draft not found", { status: 404 });
		}

		let metadata: DraftMetadata = { title: "Untitled" };
		try {
			metadata = JSON.parse(row.metadata as string);
		} catch (err) {
			this.log.warn(
				`Failed to parse draft metadata for ${slug}`,
				err instanceof Error ? { error: err.message } : {},
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

	private async handleSaveDraft(ctx: LoomRequestContext): Promise<Response> {
		const { slug } = ctx.params;
		const draft = (await ctx.request.json()) as Omit<Draft, "slug" | "lastSaved">;
		const now = Date.now();

		this.sql.exec(
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

	private async handleDeleteDraft(ctx: LoomRequestContext): Promise<Response> {
		const { slug } = ctx.params;
		this.sql.exec("DELETE FROM drafts WHERE slug = ?", slug);
		return Response.json({ success: true });
	}

	// ============================================================================
	// Analytics Methods
	// ============================================================================

	private async handleRecordEvent(ctx: LoomRequestContext): Promise<Response> {
		const event = (await ctx.request.json()) as AnalyticsEvent;

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
			this.log.warn(`Analytics buffer hit max (${MAX_ANALYTICS_BUFFER}), forcing flush`);
			await this.flushAnalytics();
		} else if (this.analyticsBuffer.length >= 100) {
			// Normal flush threshold
			await this.flushAnalytics();
		} else {
			// Schedule flush via alarm if not already set
			await this.alarms.ensureScheduled(ANALYTICS_ALARM_MS);
		}

		return Response.json({ success: true });
	}

	// ============================================================================
	// Alarm Handler
	// ============================================================================

	protected async onAlarm(): Promise<void> {
		await this.flushAnalytics();
	}

	private async flushAnalytics(): Promise<void> {
		if (this.analyticsBuffer.length === 0) return;

		const events = this.analyticsBuffer.splice(0, this.analyticsBuffer.length);
		const subdomain = this.getSubdomain() || "unknown";

		// For now, just log - analytics table implementation deferred to Rings
		this.log.info(`Flushing ${events.length} analytics events for ${subdomain}`);

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
	 */
	private getSubdomain(): string | null {
		return this.subdomain || this.state_data?.subdomain || null;
	}
}
