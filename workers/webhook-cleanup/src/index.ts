/**
 * Webhook & Export Cleanup Worker
 *
 * Scheduled worker that runs daily at 3:00 AM UTC via Cloudflare Cron Trigger.
 *
 * Cleans up:
 * 1. Expired webhook events (120-day retention)
 * 2. Expired zip exports (7-day retention) — deletes R2 objects and updates D1 status
 * 3. Expired Fireside conversations (90 days, unless the transcript is published)
 *
 * First consumer of the Infra SDK — all D1/R2 access goes through GroveContext.
 */

import { createCloudflareContext } from "@autumnsgrove/infra/cloudflare";
import type { GroveContext } from "@autumnsgrove/infra";
import { jsonResponse, errorResponse } from "@autumnsgrove/infra/response";

export interface Env {
	DB: D1Database;
	EXPORTS_BUCKET: R2Bucket;
}

/**
 * Maximum records to delete per batch.
 * D1 has limits on statement execution time, so we batch deletions.
 */
const BATCH_SIZE = 1000;

/**
 * Maximum batches per invocation.
 * Prevents runaway execution if there's a huge backlog.
 */
const MAX_BATCHES = 50;

/**
 * Maximum expired exports to clean per invocation.
 * Each requires an R2 delete, so keep this modest.
 */
const EXPORT_CLEANUP_LIMIT = 50;

/**
 * Maximum expired conversations to let go per invocation.
 *
 * A session is a handful of rows and they cascade, so this is a ceiling against a
 * backlog, not against cost.
 */
const FIRESIDE_CLEANUP_LIMIT = 500;

/**
 * Create an Infra SDK context from the Worker env, wired with an observer.
 */
function createContext(env: Env): GroveContext {
	return createCloudflareContext({
		db: env.DB,
		storage: env.EXPORTS_BUCKET,
		env: env as unknown as Record<string, unknown>,
		observer: (event) => {
			console.log(
				`[Infra] ${event.service}.${event.operation} ` +
					`${event.ok ? "ok" : "ERR"} ${event.durationMs.toFixed(1)}ms` +
					`${event.detail ? ` — ${event.detail}` : ""}`,
			);
		},
	});
}

/**
 * Clean up expired export zip files from R2 and mark as expired in D1.
 */
export async function cleanupExpiredExports(ctx: GroveContext): Promise<number> {
	const now = Math.floor(Date.now() / 1000);
	let cleaned = 0;

	try {
		// Find completed exports that have expired
		const expired = await ctx.db.execute(
			`SELECT id, r2_key FROM storage_exports
       WHERE status = 'complete' AND expires_at IS NOT NULL AND expires_at < ?
       LIMIT ?`,
			[now, EXPORT_CLEANUP_LIMIT],
		);

		for (const row of expired.results) {
			const exp = { id: String(row.id), r2_key: row.r2_key ? String(row.r2_key) : null };
			try {
				// Delete R2 object if it exists
				if (exp.r2_key) {
					await ctx.storage.delete(exp.r2_key);
				}

				// Mark as expired in D1
				await ctx.db.execute(
					"UPDATE storage_exports SET status = 'expired', r2_key = NULL WHERE id = ?",
					[exp.id],
				);

				cleaned++;
			} catch (err) {
				// Log individual failures but continue cleaning others
				console.error(
					`[Export Cleanup] Failed to clean export ${exp.id}:`,
					err instanceof Error ? err.message : String(err),
				);
			}
		}

		if (cleaned > 0) {
			console.log(`[Export Cleanup] Cleaned ${cleaned} expired export(s)`);
		} else {
			console.log("[Export Cleanup] No expired exports to clean up");
		}
	} catch (err) {
		console.error(
			"[Export Cleanup] Failed to query expired exports:",
			err instanceof Error ? err.message : String(err),
		);
	}

	return cleaned;
}

/**
 * Delete expired webhooks in batches via Infra SDK.
 */ export async function cleanupExpiredWebhooks(ctx: GroveContext): Promise<{
	totalDeleted: number;
	batchCount: number;
}> {
	const now = Math.floor(Date.now() / 1000);
	let totalDeleted = 0;
	let batchCount = 0;

	while (batchCount < MAX_BATCHES) {
		const result = await ctx.db.execute(
			`DELETE FROM webhook_events
       WHERE id IN (
         SELECT id FROM webhook_events
         WHERE expires_at IS NOT NULL AND expires_at < ?
         LIMIT ?
       )`,
			[now, BATCH_SIZE],
		);

		// Safe: CloudflareDatabase.extractMeta() guarantees changes is always a number (falls back to 0)
		const deletedInBatch = result.meta.changes;
		totalDeleted += deletedInBatch;
		batchCount++;

		if (deletedInBatch < BATCH_SIZE) {
			break;
		}
	}

	return { totalDeleted, batchCount };
}

/**
 * Let go of Fireside conversations that were never published.
 *
 * A conversation is kept for ninety days so a writer can come back to it, and then
 * it goes. One thing is exempt, and it is the whole reason the sweep exists rather
 * than a bare TTL: **a published transcript is a promise to a reader**, and it may
 * not evaporate because a timer ran out.
 *
 * Deleting the session does not touch the post. `posts.fireside_session_id` is
 * `ON DELETE SET NULL`, so the post keeps its attribution — the marker stays true
 * even when the conversation behind it is gone.
 *
 * Fails quietly on a database without the table: production carries this worker
 * before migration 128 is applied, and a missing table must not take down the
 * webhook and export cleanup that runs beside it.
 */
export async function cleanupExpiredFiresideSessions(ctx: GroveContext): Promise<number> {
	const now = Math.floor(Date.now() / 1000);

	try {
		const result = await ctx.db.execute(
			`DELETE FROM fireside_sessions
       WHERE id IN (
         SELECT id FROM fireside_sessions
         WHERE expires_at IS NOT NULL
           AND expires_at < ?
           AND transcript_public = 0
         LIMIT ?
       )`,
			[now, FIRESIDE_CLEANUP_LIMIT],
		);

		const deleted = result.meta.changes;
		if (deleted > 0) {
			console.log(`[Fireside Cleanup] Let go of ${deleted} unpublished conversation(s)`);
		} else {
			console.log("[Fireside Cleanup] No expired conversations to clean up");
		}

		return deleted;
	} catch (err) {
		console.error(
			"[Fireside Cleanup] Failed to sweep expired conversations:",
			err instanceof Error ? err.message : String(err),
		);
		return 0;
	}
}

export default {
	/**
	 * Cron trigger handler - called by Cloudflare Cron
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		execCtx: ExecutionContext,
	): Promise<void> {
		const ctx = createContext(env);

		// 1. Clean up expired webhooks
		try {
			const { totalDeleted, batchCount } = await cleanupExpiredWebhooks(ctx);

			if (totalDeleted > 0) {
				console.log(
					`[Webhook Cleanup] Deleted ${totalDeleted} expired events in ${batchCount} batch(es)`,
				);
			} else {
				console.log("[Webhook Cleanup] No expired webhooks to clean up");
			}
		} catch (err) {
			console.error("[Webhook Cleanup] Failed:", err instanceof Error ? err.message : String(err));
			// Don't throw — continue to export cleanup
		}

		// 2. Clean up expired exports (R2 + D1)
		await cleanupExpiredExports(ctx);

		// 3. Let go of unpublished conversations
		await cleanupExpiredFiresideSessions(ctx);
	},

	/**
	 * HTTP handler - for manual testing/debugging
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method !== "GET") {
			return errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED");
		}

		const ctx = createContext(env);

		try {
			const { totalDeleted, batchCount } = await cleanupExpiredWebhooks(ctx);
			const exportsCleaned = await cleanupExpiredExports(ctx);
			const conversationsCleaned = await cleanupExpiredFiresideSessions(ctx);

			return jsonResponse({
				webhooks: { deleted: totalDeleted, batches: batchCount },
				exports: { cleaned: exportsCleaned },
				fireside: { cleaned: conversationsCleaned },
				message:
					totalDeleted > 0 || exportsCleaned > 0 || conversationsCleaned > 0
						? `Deleted ${totalDeleted} expired webhooks, cleaned ${exportsCleaned} expired exports, ` +
							`let go of ${conversationsCleaned} expired conversations`
						: "Nothing to clean up",
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			return errorResponse(message, 500, "INTERNAL_ERROR");
		}
	},
};
