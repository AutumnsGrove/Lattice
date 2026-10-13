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
	safeJsonParse,
} from "@autumnsgrove/loom";
import { getTenantStorageUsed } from "@autumnsgrove/lattice/server/services/gallery-storage";
import { TIERS, type TierKey, type PaidTierKey } from "./tiers.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum analytics events to buffer before forcing a flush.
 * Prevents memory leak if alarm mechanism fails.
 */
const MAX_ANALYTICS_BUFFER = 1000;

/** In-memory config staleness threshold: 5 minutes */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/** SQLite config staleness threshold: 1 hour — forces a D1 refresh to pick up external changes */
const SQLITE_STALE_THRESHOLD_MS = 60 * 60 * 1000;

/** Analytics flush alarm delay: 1 minute */
const ANALYTICS_ALARM_MS = 60_000;

/**
 * Draft backup flush alarm delay: 5 minutes — matches the batching cadence
 * documented in docs/patterns/loom-durable-objects-pattern.md. TenantDO's own
 * SQLite `drafts` table is already durable and remains authoritative; this
 * just mirrors it into D1 (`draft_backups`) so drafts survive a tenant's DO
 * storage ever being wiped and are queryable with normal admin tooling.
 */
const DRAFTS_FLUSH_ALARM_MS = 5 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export interface TenantConfig {
	id: string; // Tenant UUID from D1 - cached to avoid repeated lookups
	subdomain: string;
	displayName: string;
	theme: Record<string, unknown> | null;
	tier: PaidTierKey; // Uses centralized type from tiers.ts (excludes 'wanderer' since tenants are paying)
	limits: TierLimits;
	ownerId: string;
}

export interface TierLimits {
	postsPerMonth: number;
	storageBytes: number;
	storageDisplay: string;
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

	// Pending upload reservations: bytes approved but not yet committed to D1.
	// Tracked in-memory so concurrent uploads within the same DO instance see
	// each other's reserved bytes and can't collectively exceed the quota.
	// Entries expire after 2 minutes — well beyond any realistic upload duration.
	private pendingUploads = new Map<string, { bytes: number; expiresAt: number }>();
	private static readonly RESERVATION_TTL_MS = 120_000;

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
		return safeJsonParse<TenantConfig | null>(rows[0].value, null);
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
			{
				method: "POST",
				path: "/config/flush",
				handler: () => this.handleFlushConfig(),
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
			// Storage quota check — serialized per-tenant by the DO's single-writer guarantee
			{
				method: "POST",
				path: "/storage/check",
				handler: (ctx) => this.handleStorageCheck(ctx),
			},
			// Storage reservation release — called after upload commits to D1
			{
				method: "POST",
				path: "/storage/release",
				handler: (ctx) => this.handleStorageRelease(ctx),
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
		// Try DO storage first (fastest), but respect staleness TTL
		const rows = this.sql.queryAll<{ value: string; updated_at: number }>(
			"SELECT value, updated_at FROM config WHERE key = 'tenant_config'",
		);

		if (rows.length > 0 && rows[0].value) {
			const age = Date.now() - (rows[0].updated_at || 0);
			const isSqliteStale = age > SQLITE_STALE_THRESHOLD_MS;

			if (!isSqliteStale) {
				const parsed = safeJsonParse<TenantConfig | null>(rows[0].value, null);
				if (parsed) {
					this.state_data = parsed;
					if (this.state_data?.subdomain && !this.subdomain) {
						this.subdomain = this.state_data.subdomain;
					}
					this.configLoadedAt = Date.now();
					return;
				} else {
					this.log.warn("Failed to parse cached config, clearing");
					this.sql.exec("DELETE FROM config WHERE key = 'tenant_config'");
				}
			} else {
				this.log.info(`SQLite config stale (${Math.round(age / 60000)}m), refreshing from D1`);
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
			const theme = row.theme ? safeJsonParse(row.theme as string, null) : null;

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
	 * Flush cached config — clears DO SQLite and forces a D1 refresh on next request.
	 */
	private async handleFlushConfig(): Promise<Response> {
		this.sql.exec("DELETE FROM config WHERE key = 'tenant_config'");
		this.state_data = null;
		this.configLoadedAt = 0;
		this.log.info("Config cache flushed");

		// Immediately re-fetch from D1 so the response contains the fresh config
		await this.refreshConfig();

		return Response.json({
			success: true,
			flushed: true,
			config: this.state_data,
		});
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
			storageDisplay: tierConfig.limits.storageDisplay,
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
			const metadata = safeJsonParse<DraftMetadata>(row.metadata as string, { title: "Untitled" });
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

		const metadata = safeJsonParse<DraftMetadata>(row.metadata as string, { title: "Untitled" });

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

		// Dedup no-ops if a flush is already pending — the next alarm fire will
		// pick up this save along with anything else written before it lands.
		await this.alarms.ensureScheduled(DRAFTS_FLUSH_ALARM_MS);

		return Response.json({ success: true, lastSaved: now });
	}

	/**
	 * Mirror all current drafts into D1's draft_backups table. Cheap to run
	 * unconditionally — a tenant typically has a handful of in-progress drafts
	 * at most, so there's no need to track per-slug dirty state.
	 */
	private async flushDraftsToD1(): Promise<void> {
		const drafts = this.sql.queryAll<{
			slug: string;
			content: string;
			metadata: string;
			last_saved: number;
			device_id: string;
		}>("SELECT slug, content, metadata, last_saved, device_id FROM drafts");

		if (drafts.length === 0) return;

		if (!this.state_data) {
			await this.locks.withLock("refresh", () => this.refreshConfig());
		}
		if (!this.state_data) {
			this.log.warn("Skipping draft backup flush: tenant config unavailable");
			return;
		}

		const tenantId = this.state_data.id;
		const backedUpAt = Date.now();

		const statements = drafts.map((d) =>
			this.env.DB.prepare(
				`INSERT INTO draft_backups (tenant_id, slug, content, metadata, last_saved, device_id, backed_up_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, slug) DO UPDATE SET
           content = excluded.content,
           metadata = excluded.metadata,
           last_saved = excluded.last_saved,
           device_id = excluded.device_id,
           backed_up_at = excluded.backed_up_at`,
			).bind(tenantId, d.slug, d.content, d.metadata, d.last_saved, d.device_id, backedUpAt),
		);

		try {
			await this.env.DB.batch(statements);
		} catch (error) {
			this.log.error("Failed to flush draft backups to D1", { error: String(error) });
		}
	}

	private async handleDeleteDraft(ctx: LoomRequestContext): Promise<Response> {
		const { slug } = ctx.params;
		this.sql.exec("DELETE FROM drafts WHERE slug = ?", slug);
		return Response.json({ success: true });
	}

	// ============================================================================
	// Storage Methods
	// ============================================================================

	/**
	 * Check whether a tenant can upload a file of the given size.
	 *
	 * Queries D1 for committed bytes and adds any in-flight reservations before
	 * checking against the tier limit. If allowed, registers a reservation so
	 * subsequent concurrent checks see the bytes as "spoken for" until the upload
	 * commits to D1 or the reservation TTL expires (2 minutes).
	 *
	 * The DO's single-writer guarantee means only one check runs at a time per
	 * tenant, so the committed+pending sum is always consistent — no TOCTOU race.
	 *
	 * Input:  { bytes: number }  — size of the file being uploaded
	 * Output: { allowed, usedBytes, limitBytes, storageDisplay }
	 */
	private async handleStorageCheck(ctx: LoomRequestContext): Promise<Response> {
		const { bytes } = (await ctx.request.json()) as { bytes: number };

		if (!this.state_data) {
			await this.locks.withLock("refresh", () => this.refreshConfig());
		}

		if (!this.state_data) {
			return new Response("Tenant not found", { status: 404 });
		}

		const { storageBytes, storageDisplay } = this.state_data.limits;

		// Sweep expired reservations and sum the active pending bytes.
		const now = Date.now();
		let pendingBytes = 0;
		for (const [id, res] of this.pendingUploads) {
			if (res.expiresAt <= now) {
				this.pendingUploads.delete(id);
			} else {
				pendingBytes += res.bytes;
			}
		}

		const usage = await getTenantStorageUsed(this.env.DB, this.state_data.id);
		if (!usage.ok) {
			// Callers fail open on non-OK, same as when this query used to throw.
			return new Response("Storage usage unavailable", { status: 500 });
		}

		const usedBytes = usage.bytes;
		const allowed = usedBytes + pendingBytes + bytes <= storageBytes;

		let reservationId: string | undefined;
		if (allowed) {
			// Reserve these bytes until the upload commits to D1 or the TTL expires.
			// Concurrent uploads within this DO instance will see this reservation
			// and factor it into their own quota calculations.
			reservationId = crypto.randomUUID();
			this.pendingUploads.set(reservationId, {
				bytes,
				expiresAt: now + TenantDO.RESERVATION_TTL_MS,
			});
		}

		return Response.json({
			allowed,
			usedBytes,
			limitBytes: storageBytes,
			storageDisplay,
			reservationId,
		});
	}

	/**
	 * Release a storage reservation after an upload successfully commits to D1.
	 * Prevents reservations from double-counting against the quota for up to the TTL.
	 *
	 * Input:  { reservationId: string }
	 * Output: { released: boolean }
	 */
	private async handleStorageRelease(ctx: LoomRequestContext): Promise<Response> {
		const { reservationId } = (await ctx.request.json()) as { reservationId: string };
		const released = this.pendingUploads.delete(reservationId);
		return Response.json({ released });
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
		// TenantDO has a single alarm slot shared across concerns (Loom's
		// dedup-on-schedule pattern) — whichever fires runs everything pending.
		await this.flushAnalytics();
		await this.flushDraftsToD1();
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
