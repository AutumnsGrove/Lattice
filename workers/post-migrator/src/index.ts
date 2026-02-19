/**
 * Post Migrator Worker - Hot/Warm/Cold Storage Migration
 *
 * Runs daily via cron trigger to optimize storage costs:
 * - Hot → Warm: Posts >7 days old with <10 views/week
 * - Warm → Cold: Posts >30 days old with <1 view/week (content → R2)
 * - Cold → Warm: Popular post detected (auto-promote)
 *
 * Storage tiers:
 * - Hot: DO memory (fast, expensive for inactive content)
 * - Warm: DO SQLite (hibernates, moderate cost)
 * - Cold: R2 bucket (bulk storage, $0.015/GB)
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// ============================================================================
// Types
// ============================================================================

interface Env {
	DB: D1Database;
	COLD_STORAGE: R2Bucket;

	// Config vars (defaults, overridden by tier-specific thresholds)
	HOT_TO_WARM_DAYS: string;
	WARM_TO_COLD_DAYS: string;
	BATCH_SIZE: string;

	// Secret for manual trigger authentication
	MIGRATOR_SECRET?: string;
}

/**
 * Tier-based storage migration thresholds
 *
 * Philosophy: Higher-tier tenants pay more, so we keep their content
 * in faster storage tiers longer. Lower thresholds = stay hot/warm longer.
 *
 * Views per week required to stay in current tier:
 * - hotViewThreshold: Views needed to stay in HOT storage
 * - warmViewThreshold: Views needed to stay in WARM storage (vs moving to COLD)
 * - coldPromotionThreshold: Views that trigger promotion back from COLD
 */
type TierKey = "free" | "seedling" | "sapling" | "oak" | "evergreen";

/**
 * Default tier used when tier is unknown or invalid.
 * Should match DEFAULT_TIER in libs/engine/src/lib/config/tiers.ts
 */
const DEFAULT_TIER: TierKey = "seedling";

interface StorageTierThresholds {
	hotViewThreshold: number; // Views/week to stay HOT
	warmViewThreshold: number; // Views/week to stay WARM
	coldPromotionThreshold: number; // Views/week to promote from COLD
	hotToWarmDays: number; // Days before eligible for HOT→WARM
	warmToColdDays: number; // Days before eligible for WARM→COLD
}

const STORAGE_THRESHOLDS: Record<TierKey, StorageTierThresholds> = {
	// Free tier: Most aggressive migration (no blog, but for future)
	free: {
		hotViewThreshold: 15,
		warmViewThreshold: 3,
		coldPromotionThreshold: 5,
		hotToWarmDays: 5,
		warmToColdDays: 21,
	},
	// Seedling: Entry tier, moderate thresholds
	seedling: {
		hotViewThreshold: 10,
		warmViewThreshold: 2,
		coldPromotionThreshold: 3,
		hotToWarmDays: 7,
		warmToColdDays: 30,
	},
	// Sapling: Growing tier, keep content warmer
	sapling: {
		hotViewThreshold: 7,
		warmViewThreshold: 1,
		coldPromotionThreshold: 2,
		hotToWarmDays: 10,
		warmToColdDays: 45,
	},
	// Oak: Premium tier, content stays warm longer
	oak: {
		hotViewThreshold: 5,
		warmViewThreshold: 1,
		coldPromotionThreshold: 1,
		hotToWarmDays: 14,
		warmToColdDays: 60,
	},
	// Evergreen: Top tier, most permissive - rarely moves to cold
	evergreen: {
		hotViewThreshold: 3,
		warmViewThreshold: 1,
		coldPromotionThreshold: 1,
		hotToWarmDays: 21,
		warmToColdDays: 90,
	},
};

interface PostRecord {
	id: number;
	tenant_id: string;
	slug: string;
	title: string;
	markdown_content: string;
	html_content: string;
	gutter_content: string;
	storage_location: "hot" | "warm" | "cold";
	r2_key: string | null;
	published_at: string | null;
	updated_at: string;
	tier?: TierKey; // From joined tenants table
}

/**
 * Validate that a string is a valid TierKey
 */
function isValidTier(tier: string | undefined | null): tier is TierKey {
	if (!tier) return false;
	return tier in STORAGE_THRESHOLDS;
}

/**
 * Get storage thresholds for a tier, with fallback to DEFAULT_TIER
 *
 * This validates the tier at runtime since the value comes from D1
 * and could theoretically be invalid (e.g., old data, schema mismatch).
 */
function getStorageThresholds(tier: string | undefined): StorageTierThresholds {
	if (isValidTier(tier)) {
		return STORAGE_THRESHOLDS[tier];
	}
	// Log invalid tier for observability (helps catch schema drift)
	if (tier !== undefined) {
		console.warn(`[PostMigrator] Unknown tier "${tier}", falling back to "${DEFAULT_TIER}"`);
	}
	return STORAGE_THRESHOLDS[DEFAULT_TIER];
}

interface MigrationResult {
	hotToWarm: number;
	warmToCold: number;
	coldToWarm: number;
	errors: string[];
}

// ============================================================================
// Worker Export
// ============================================================================

export default {
	/**
	 * Scheduled handler - DISABLED
	 *
	 * Storage tier migration is disabled until D1 costs justify it.
	 * The cron trigger has been removed from wrangler.toml, but this
	 * handler is also a no-op as a safety belt.
	 *
	 * Before re-enabling, fix the published_at timestamp bug:
	 * - published_at stores SECONDS, but was passed to new Date() without * 1000
	 * - This made all posts appear ~55 years old, causing immediate Hot→Warm→Cold
	 * - Content was cleared from D1 and moved to R2, breaking page rendering
	 */
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[PostMigrator] Migration DISABLED - no-op at ${new Date().toISOString()}`);
		// Storage tier migration is disabled. See comment above.
		return;
	},

	/**
	 * HTTP handler - for manual trigger and health checks
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Health check
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ status: "ok", service: "post-migrator" }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Manual trigger (requires auth in production)
		if (url.pathname === "/run" && request.method === "POST") {
			// Validate Bearer token against MIGRATOR_SECRET
			const authHeader = request.headers.get("Authorization");
			if (!authHeader?.startsWith("Bearer ")) {
				return new Response("Unauthorized: Missing Bearer token", {
					status: 401,
				});
			}

			// Extract and validate the token
			const token = authHeader.replace("Bearer ", "");
			if (!env.MIGRATOR_SECRET || token !== env.MIGRATOR_SECRET) {
				return new Response("Unauthorized: Invalid token", { status: 401 });
			}

			try {
				const result = await runMigration(env);
				return new Response(JSON.stringify(result), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (err) {
				return new Response(
					JSON.stringify({
						error: err instanceof Error ? err.message : "Migration failed",
					}),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		// Status endpoint - show migration stats
		if (url.pathname === "/status") {
			try {
				const stats = await getStorageStats(env);
				return new Response(JSON.stringify(stats), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (err) {
				return new Response(
					JSON.stringify({
						error: err instanceof Error ? err.message : "Failed to get stats",
					}),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		// Recovery endpoint - restore all cold/warm posts back to hot
		// This reverses the damage from the timestamp bug that migrated all posts
		if (url.pathname === "/recover" && request.method === "POST") {
			const authHeader = request.headers.get("Authorization");
			if (!authHeader?.startsWith("Bearer ")) {
				return new Response("Unauthorized: Missing Bearer token", {
					status: 401,
				});
			}
			const token = authHeader.replace("Bearer ", "");
			if (!env.MIGRATOR_SECRET || token !== env.MIGRATOR_SECRET) {
				return new Response("Unauthorized: Invalid token", { status: 401 });
			}

			try {
				const result = await recoverAllPosts(env);
				return new Response(JSON.stringify(result), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (err) {
				return new Response(
					JSON.stringify({
						error: err instanceof Error ? err.message : "Recovery failed",
					}),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		return new Response("Not Found", { status: 404 });
	},
};

// ============================================================================
// Migration Logic
// ============================================================================

async function runMigration(env: Env): Promise<MigrationResult> {
	const result: MigrationResult = {
		hotToWarm: 0,
		warmToCold: 0,
		coldToWarm: 0,
		errors: [],
	};

	// Default values from env (used as fallback)
	const defaultHotToWarmDays = parseInt(env.HOT_TO_WARM_DAYS || "7", 10);
	const defaultWarmToColdDays = parseInt(env.WARM_TO_COLD_DAYS || "30", 10);
	const batchSize = parseInt(env.BATCH_SIZE || "100", 10);

	const now = Date.now();
	const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

	// --- Hot → Warm Migration ---
	// Fetch posts with their tenant's tier, then apply tier-specific thresholds
	try {
		// Get all HOT posts with their tier and view counts
		const hotPosts = await env.DB.prepare(
			`
      SELECT p.id, p.tenant_id, p.slug, p.title, p.storage_location,
             p.published_at, t.plan as tier, COALESCE(v.view_count, 0) as view_count
      FROM posts p
      JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as view_count
        FROM post_views
        WHERE viewed_at > ?
        GROUP BY post_id
      ) v ON p.id = v.post_id
      WHERE p.storage_location = 'hot'
        AND p.published_at IS NOT NULL
      LIMIT ?
    `,
		)
			.bind(weekAgo, batchSize * 5) // Fetch more, filter in code
			.all<PostRecord & { view_count: number }>();

		for (const post of hotPosts.results || []) {
			const thresholds = getStorageThresholds(post.tier);
			const publishedAt = Number(post.published_at!) * 1000; // seconds → milliseconds
			const ageDays = (now - publishedAt) / (24 * 60 * 60 * 1000);

			// Check tier-specific criteria
			if (ageDays >= thresholds.hotToWarmDays && post.view_count < thresholds.hotViewThreshold) {
				try {
					await env.DB.prepare(
						`UPDATE posts SET storage_location = 'warm', updated_at = ? WHERE id = ?`,
					)
						.bind(Date.now(), post.id)
						.run();

					result.hotToWarm++;
					console.log(
						`[PostMigrator] Hot → Warm: ${post.tenant_id}/${post.slug} (tier: ${post.tier}, ${post.view_count} views, ${Math.floor(ageDays)}d old)`,
					);
				} catch (err) {
					result.errors.push(`Hot→Warm failed for ${post.slug}: ${err}`);
				}
			}

			// Respect batch size for actual migrations
			if (result.hotToWarm >= batchSize) break;
		}
	} catch (err) {
		result.errors.push(`Hot→Warm query failed: ${err}`);
	}

	// --- Warm → Cold Migration ---
	// Move content to R2 for posts that haven't been viewed
	try {
		const warmPosts = await env.DB.prepare(
			`
      SELECT p.id, p.tenant_id, p.slug, p.title, p.markdown_content,
             p.html_content, p.gutter_content, p.storage_location,
             p.published_at, t.plan as tier, COALESCE(v.view_count, 0) as view_count
      FROM posts p
      JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as view_count
        FROM post_views
        WHERE viewed_at > ?
        GROUP BY post_id
      ) v ON p.id = v.post_id
      WHERE p.storage_location = 'warm'
        AND p.r2_key IS NULL
        AND p.published_at IS NOT NULL
      LIMIT ?
    `,
		)
			.bind(weekAgo, batchSize * 5)
			.all<PostRecord & { view_count: number }>();

		for (const post of warmPosts.results || []) {
			const thresholds = getStorageThresholds(post.tier);
			const publishedAt = Number(post.published_at!) * 1000; // seconds → milliseconds
			const ageDays = (now - publishedAt) / (24 * 60 * 60 * 1000);

			// Check tier-specific criteria
			if (ageDays >= thresholds.warmToColdDays && post.view_count < thresholds.warmViewThreshold) {
				try {
					// Generate R2 key
					const r2Key = `cold/${post.tenant_id}/${post.slug}.json`;

					// Upload content to R2
					await env.COLD_STORAGE.put(
						r2Key,
						JSON.stringify({
							markdownContent: post.markdown_content,
							htmlContent: post.html_content,
							gutterContent: post.gutter_content,
						}),
						{ httpMetadata: { contentType: "application/json" } },
					);

					// Update D1 - clear content, set r2_key
					await env.DB.prepare(
						`
            UPDATE posts
            SET storage_location = 'cold',
                markdown_content = '',
                html_content = '',
                gutter_content = '[]',
                r2_key = ?,
                updated_at = ?
            WHERE id = ?
          `,
					)
						.bind(r2Key, Date.now(), post.id)
						.run();

					result.warmToCold++;
					console.log(
						`[PostMigrator] Warm → Cold: ${post.tenant_id}/${post.slug} → ${r2Key} (tier: ${post.tier})`,
					);
				} catch (err) {
					result.errors.push(`Warm→Cold failed for ${post.slug}: ${err}`);
				}
			}

			if (result.warmToCold >= batchSize) break;
		}
	} catch (err) {
		result.errors.push(`Warm→Cold query failed: ${err}`);
	}

	// --- Cold → Warm Promotion ---
	// Cold posts that received views recently should be promoted back
	try {
		const coldPosts = await env.DB.prepare(
			`
      SELECT p.id, p.tenant_id, p.slug, p.r2_key, t.plan as tier,
             COALESCE(v.view_count, 0) as view_count
      FROM posts p
      JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as view_count
        FROM post_views
        WHERE viewed_at > ?
        GROUP BY post_id
      ) v ON p.id = v.post_id
      WHERE p.storage_location = 'cold'
        AND p.r2_key IS NOT NULL
      LIMIT ?
    `,
		)
			.bind(weekAgo, batchSize * 5)
			.all<PostRecord & { view_count: number }>();

		for (const post of coldPosts.results || []) {
			const thresholds = getStorageThresholds(post.tier);

			// Check tier-specific promotion threshold
			if (post.view_count >= thresholds.coldPromotionThreshold) {
				try {
					// Fetch content from R2
					const r2Object = await env.COLD_STORAGE.get(post.r2_key!);
					if (!r2Object) {
						result.errors.push(`Cold→Warm: R2 object not found for ${post.slug}`);
						continue;
					}

					const content = (await r2Object.json()) as {
						markdownContent: string;
						htmlContent: string;
						gutterContent: string;
					};

					// Restore content to D1
					await env.DB.prepare(
						`
            UPDATE posts
            SET storage_location = 'warm',
                markdown_content = ?,
                html_content = ?,
                gutter_content = ?,
                r2_key = NULL,
                updated_at = ?
            WHERE id = ?
          `,
					)
						.bind(
							content.markdownContent,
							content.htmlContent,
							content.gutterContent,
							Date.now(),
							post.id,
						)
						.run();

					// Delete from R2 (content is now in D1)
					await env.COLD_STORAGE.delete(post.r2_key!);

					result.coldToWarm++;
					console.log(
						`[PostMigrator] Cold → Warm: ${post.tenant_id}/${post.slug} (tier: ${post.tier}, ${post.view_count} views)`,
					);
				} catch (err) {
					result.errors.push(`Cold→Warm failed for ${post.slug}: ${err}`);
				}
			}

			if (result.coldToWarm >= batchSize) break;
		}
	} catch (err) {
		result.errors.push(`Cold→Warm query failed: ${err}`);
	}

	// Log migration run for observability
	try {
		await env.DB.prepare(
			`
      INSERT INTO migration_runs (run_at, hot_to_warm, warm_to_cold, cold_to_warm, errors)
      VALUES (?, ?, ?, ?, ?)
    `,
		)
			.bind(
				Date.now(),
				result.hotToWarm,
				result.warmToCold,
				result.coldToWarm,
				result.errors.length > 0 ? JSON.stringify(result.errors) : null,
			)
			.run();
	} catch {
		// Non-critical - don't fail migration if logging fails
		console.warn("[PostMigrator] Failed to log migration run");
	}

	return result;
}

// ============================================================================
// Recovery - Restore all migrated posts back to D1
// ============================================================================

interface RecoveryResult {
	coldRestored: number;
	warmReset: number;
	errors: string[];
}

/**
 * Recover all posts that were incorrectly migrated by the timestamp bug.
 *
 * For cold posts: fetch content from R2 and restore to D1
 * For warm posts: just reset storage_location to 'hot' (content still in D1)
 * For all: set storage_location back to 'hot'
 */
async function recoverAllPosts(env: Env): Promise<RecoveryResult> {
	const result: RecoveryResult = {
		coldRestored: 0,
		warmReset: 0,
		errors: [],
	};

	// --- Restore cold posts (content in R2) ---
	try {
		const coldPosts = await env.DB.prepare(
			`SELECT id, tenant_id, slug, r2_key FROM posts WHERE storage_location = 'cold' AND r2_key IS NOT NULL`,
		).all<{ id: number; tenant_id: string; slug: string; r2_key: string }>();

		for (const post of coldPosts.results || []) {
			try {
				const r2Object = await env.COLD_STORAGE.get(post.r2_key);
				if (!r2Object) {
					result.errors.push(
						`R2 object not found for ${post.tenant_id}/${post.slug} at ${post.r2_key}`,
					);
					continue;
				}

				const content = (await r2Object.json()) as {
					markdownContent: string;
					htmlContent: string;
					gutterContent: string;
				};

				await env.DB.prepare(
					`UPDATE posts
           SET storage_location = 'hot',
               markdown_content = ?,
               html_content = ?,
               gutter_content = ?,
               r2_key = NULL,
               updated_at = ?
           WHERE id = ?`,
				)
					.bind(
						content.markdownContent,
						content.htmlContent,
						content.gutterContent,
						Date.now(),
						post.id,
					)
					.run();

				result.coldRestored++;
				console.log(`[Recovery] Restored cold post: ${post.tenant_id}/${post.slug}`);
			} catch (err) {
				result.errors.push(`Failed to restore ${post.tenant_id}/${post.slug}: ${err}`);
			}
		}
	} catch (err) {
		result.errors.push(`Cold recovery query failed: ${err}`);
	}

	// --- Reset warm posts (content still in D1, just reset location) ---
	try {
		const warmResult = await env.DB.prepare(
			`UPDATE posts SET storage_location = 'hot', updated_at = ? WHERE storage_location = 'warm'`,
		)
			.bind(Date.now())
			.run();

		result.warmReset = warmResult.meta?.changes || 0;
		console.log(`[Recovery] Reset ${result.warmReset} warm posts to hot`);
	} catch (err) {
		result.errors.push(`Warm reset failed: ${err}`);
	}

	console.log("[Recovery] Complete:", result);
	return result;
}

// ============================================================================
// Stats Helper
// ============================================================================

async function getStorageStats(env: Env): Promise<{
	hot: number;
	warm: number;
	cold: number;
	total: number;
	lastRun?: string;
}> {
	const stats = await env.DB.prepare(
		`
    SELECT
      storage_location,
      COUNT(*) as count
    FROM posts
    WHERE published_at IS NOT NULL
    GROUP BY storage_location
  `,
	).all<{ storage_location: string; count: number }>();

	const result = {
		hot: 0,
		warm: 0,
		cold: 0,
		total: 0,
	};

	for (const row of stats.results || []) {
		const location = row.storage_location as "hot" | "warm" | "cold";
		result[location] = row.count;
		result.total += row.count;
	}

	return result;
}
