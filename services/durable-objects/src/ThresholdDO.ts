/**
 * ThresholdDO — Per-Identifier Rate Limiting (Loom Pattern)
 *
 * Each ThresholdDO instance handles rate limiting for a single identifier
 * (userId, IP, tenantId). This eliminates shared-state contention —
 * one user = one DO = one SQLite database.
 *
 * ID pattern: threshold:{userId|ip|tenantId}
 *
 * HTTP interface:
 *   POST /check  → { key, limit, windowSeconds } → ThresholdResult
 *   GET  /health → { status, counters, uptime }
 *
 * Alarm: cleanup expired windows every 5 minutes.
 *
 * The DO always returns honest data — fail-mode handling (open/closed)
 * stays in the ThresholdDOStore layer, not here.
 *
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";

// =============================================================================
// TYPES
// =============================================================================

interface ThresholdCheckRequest {
	key: string;
	limit: number;
	windowSeconds: number;
}

interface ThresholdResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
	retryAfter?: number;
}

// =============================================================================
// THRESHOLD DURABLE OBJECT
// =============================================================================

/** Alarm interval: 5 minutes in milliseconds */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export class ThresholdDO extends LoomDO<null, Record<string, unknown>> {
	private createdAt: number = Date.now();

	config(): LoomConfig {
		return { name: "ThresholdDO", blockOnInit: false };
	}

	protected schema(): string {
		return `
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL,
        window_seconds INTEGER NOT NULL
      )
    `;
	}

	routes(): LoomRoute[] {
		return [
			{
				method: "POST",
				path: "/check",
				handler: (ctx) => this.handleCheck(ctx),
			},
			{ method: "GET", path: "/health", handler: () => this.handleHealth() },
		];
	}

	// =========================================================================
	// POST /check — Atomic Rate Limit Check
	// =========================================================================

	private async handleCheck(ctx: LoomRequestContext): Promise<Response> {
		const body = (await ctx.request.json()) as ThresholdCheckRequest;

		if (!body.key || !body.limit || !body.windowSeconds) {
			return Response.json(
				{
					error: "bad_request",
					message: "Missing key, limit, or windowSeconds",
				},
				{ status: 400 },
			);
		}

		const nowSeconds = Math.floor(Date.now() / 1000);

		// Single atomic INSERT ON CONFLICT RETURNING — same pattern as ThresholdD1Store
		// but running on local SQLite (zero network latency, single-writer guarantee).
		const row = this.sql
			.exec(
				`INSERT INTO rate_limits (key, count, window_start, window_seconds)
				 VALUES (?, 1, ?, ?)
				 ON CONFLICT(key) DO UPDATE SET
				   count = CASE
				     WHEN window_start + window_seconds < ? THEN 1
				     ELSE count + 1
				   END,
				   window_start = CASE
				     WHEN window_start + window_seconds < ? THEN excluded.window_start
				     ELSE window_start
				   END,
				   window_seconds = excluded.window_seconds
				 RETURNING count, window_start, window_seconds`,
				body.key,
				nowSeconds,
				body.windowSeconds,
				nowSeconds,
				nowSeconds,
			)
			.one();

		const count = row.count as number;
		const windowStart = row.window_start as number;
		const windowSeconds = row.window_seconds as number;
		const resetAt = windowStart + windowSeconds;

		// Schedule cleanup alarm if not already set
		await this.alarms.ensureScheduled(CLEANUP_INTERVAL_MS);

		const result: ThresholdResult =
			count > body.limit
				? {
						allowed: false,
						remaining: 0,
						resetAt,
						retryAfter: Math.max(0, resetAt - nowSeconds),
					}
				: {
						allowed: true,
						remaining: body.limit - count,
						resetAt,
					};

		return Response.json(result);
	}

	// =========================================================================
	// GET /health — Diagnostics
	// =========================================================================

	private handleHealth(): Response {
		const row = this.sql.exec(`SELECT COUNT(*) as total FROM rate_limits`).one();

		return Response.json({
			status: "ok",
			counters: row.total as number,
			uptimeMs: Date.now() - this.createdAt,
		});
	}

	// =========================================================================
	// Alarm — Cleanup Expired Windows
	// =========================================================================

	protected async onAlarm(): Promise<void> {
		const nowSeconds = Math.floor(Date.now() / 1000);

		// Delete rows where the window has fully expired
		this.sql.exec(`DELETE FROM rate_limits WHERE window_start + window_seconds < ?`, nowSeconds);

		// Check if any rows remain — only reschedule if there's data to clean
		const remaining = this.sql.exec(`SELECT COUNT(*) as total FROM rate_limits`).one();

		if ((remaining.total as number) > 0) {
			await this.alarms.schedule(CLEANUP_INTERVAL_MS);
		}
	}
}
