/**
 * Grove Timeline Sync Worker
 *
 * Automated nightly timeline summary generation for all enabled tenants.
 *
 * Cron schedule: Daily at 1 AM UTC (after midnight activity settles)
 *
 * Each tenant generates their own summary using:
 * - Their own GitHub token (for fetching commits)
 * - Their own OpenRouter API key (for AI generation)
 *
 * Error isolation: If one tenant fails, others continue processing.
 */

import { createCloudflareContext } from "@autumnsgrove/infra/cloudflare";
import type { GroveContext } from "@autumnsgrove/infra";
import type { Env, GenerationResult } from "./config";
import { getEnabledTenants, processTenantTimeline } from "./generator";
import { createSecretsManager } from "@autumnsgrove/grove-crypto/secrets";

function createContext(env: Env): GroveContext {
	return createCloudflareContext({
		db: env.CURIO_DB,
		env: env as unknown as Record<string, unknown>,
		dbName: "grove-curios-db",
		observer: (event) => {
			console.log(
				`[Infra] ${event.service}.${event.operation} ` +
					`${event.ok ? "ok" : "ERR"} ${event.durationMs.toFixed(1)}ms` +
					`${event.detail ? ` — ${event.detail}` : ""}`,
			);
		},
	});
}

export default {
	/**
	 * Cron trigger handler - called by Cloudflare Cron at 1 AM UTC daily.
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		execCtx: ExecutionContext,
	): Promise<void> {
		const targetDate = getYesterdayUTC();
		console.log(`[Timeline Sync] Starting nightly sync for ${targetDate}...`);
		const ctx = createContext(env);

		try {
			// 1. Get enabled tenants
			const tenants = await getEnabledTenants(ctx.db);

			if (tenants.length === 0) {
				console.log("[Timeline Sync] No enabled tenants found, skipping");
				return;
			}

			console.log(`[Timeline Sync] Processing ${tenants.length} tenants...`);

			// 2. Process all tenants with error isolation
			const results = await Promise.allSettled(
				tenants.map((tenant) => processTenantTimeline(tenant, targetDate, env, ctx)),
			);

			// 3. Log summary
			logResults(
				tenants.map((t) => t.tenantId),
				results,
				targetDate,
			);
		} catch (err) {
			console.error(
				"[Timeline Sync] Fatal error:",
				err instanceof Error ? err.message : String(err),
			);
			throw err; // Re-throw to mark cron execution as failed
		}
	},

	/**
	 * HTTP handler - for manual testing and status overview.
	 *
	 * Every route below is gated by requireAdminAuth(): this worker has no
	 * per-tenant auth of its own, `/` regenerates timelines for every enabled
	 * tenant (spending their real GitHub/OpenRouter quota) in one call, and
	 * `/debug` dumps per-tenant secret/DEK existence. None of that is safe
	 * to leave open on a reachable *.workers.dev URL.
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const ctx = createContext(env);

		const isGatedRoute =
			request.method === "GET" &&
			(url.pathname === "/" || url.pathname === "/tenants" || url.pathname === "/debug");

		if (isGatedRoute) {
			const authError = requireAdminAuth(request, env);
			if (authError) return authError;
		}

		// GET / - Run sync for yesterday (for manual testing).
		// Pass ?tenantId=<id> to scope to a single tenant instead of every
		// enabled tenant — the default (no filter) still processes everyone,
		// matching cron behavior, but callers should prefer scoping down.
		if (request.method === "GET" && url.pathname === "/") {
			const targetDate = url.searchParams.get("date") || getYesterdayUTC();
			const tenantIdFilter = url.searchParams.get("tenantId");

			try {
				const allTenants = await getEnabledTenants(ctx.db);
				const tenants = tenantIdFilter
					? allTenants.filter((t) => t.tenantId === tenantIdFilter)
					: allTenants;

				if (tenantIdFilter && tenants.length === 0) {
					return Response.json(
						{ success: false, error: `Tenant ${tenantIdFilter} not found or not enabled` },
						{ status: 404 },
					);
				}

				if (tenants.length === 0) {
					return Response.json({
						success: true,
						message: "No enabled tenants found",
						date: targetDate,
						results: [],
					});
				}

				// Process all tenants
				const results: GenerationResult[] = [];
				for (const tenant of tenants) {
					const result = await processTenantTimeline(tenant, targetDate, env, ctx);
					results.push(result);
				}

				const successful = results.filter((r) => r.success).length;
				const failed = results.length - successful;
				const totalCommits = results.reduce((sum, r) => sum + (r.commitCount || 0), 0);

				return Response.json({
					success: failed === 0,
					message: `Processed ${tenants.length} tenants: ${successful} successful, ${failed} failed`,
					date: targetDate,
					totalCommits,
					results: results.map((r) => ({
						tenantId: r.tenantId,
						success: r.success,
						commitCount: r.commitCount,
						error: r.error,
					})),
				});
			} catch (err) {
				return Response.json(
					{
						success: false,
						error: err instanceof Error ? err.message : "Unknown error",
					},
					{ status: 500 },
				);
			}
		}

		// GET /tenants - List enabled tenants (for debugging)
		if (request.method === "GET" && url.pathname === "/tenants") {
			try {
				const tenants = await getEnabledTenants(ctx.db);
				return Response.json({
					count: tenants.length,
					tenants: tenants.map((t) => ({
						tenantId: t.tenantId,
						githubUsername: t.githubUsername,
						voicePreset: t.voicePreset,
						model: t.openrouterModel,
						timezone: t.timezone,
					})),
				});
			} catch (err) {
				return Response.json(
					{
						success: false,
						error: err instanceof Error ? err.message : "Unknown error",
					},
					{ status: 500 },
				);
			}
		}

		// GET /debug - Diagnostic info for debugging cron and key issues
		if (request.method === "GET" && url.pathname === "/debug") {
			try {
				// Check KEK availability
				const kekPresent = !!env.GROVE_KEK;
				const kekLength = env.GROVE_KEK?.length ?? 0;

				// Check DB connectivity
				let dbConnected = false;
				let tenantCount = 0;
				let enabledTenants: Array<{
					tenantId: string;
					githubUsername: string;
					model: string;
				}> = [];

				try {
					const tenants = await getEnabledTenants(ctx.db);
					dbConnected = true;
					tenantCount = tenants.length;
					enabledTenants = tenants.map((t) => ({
						tenantId: t.tenantId,
						githubUsername: t.githubUsername,
						model: t.openrouterModel,
					}));
				} catch (dbErr) {
					dbConnected = false;
				}

				// Check SecretsManager initialization
				let secretsManagerOk = false;
				let secretsManagerError: string | null = null;
				let secrets: Awaited<ReturnType<typeof createSecretsManager>> | null = null;
				try {
					secrets = await createSecretsManager({ DB: env.DB, GROVE_KEK: env.GROVE_KEK });
					secretsManagerOk = true;
				} catch (err) {
					secretsManagerError = kekPresent
						? `SecretsManager creation failed despite KEK being present: ${
								err instanceof Error ? err.message : String(err)
							}`
						: "GROVE_KEK not configured — SecretsManager unavailable";
				}

				// For each tenant, check if their secrets exist in the tenant_secrets table
				const tenantSecretStatus: Array<{
					tenantId: string;
					hasGithubSecret: boolean;
					hasOpenrouterSecret: boolean;
					hasDEK: boolean;
					canDecryptGithub: boolean;
					canDecryptOpenrouter: boolean;
				}> = [];

				if (dbConnected) {
					for (const t of enabledTenants) {
						try {
							// Check DEK existence
							const dekRow = await env.DB.prepare("SELECT encrypted_dek FROM tenants WHERE id = ?")
								.bind(t.tenantId)
								.first<{ encrypted_dek: string | null }>();

							// Check secret rows exist (without decrypting)
							const secretRows = await env.DB.prepare(
								`SELECT key_name FROM tenant_secrets WHERE tenant_id = ? AND key_name IN ('timeline_github_token', 'timeline_openrouter_key')`,
							)
								.bind(t.tenantId)
								.all<{ key_name: string }>();

							const secretKeys = new Set(secretRows.results?.map((r) => r.key_name) ?? []);

							// Try actual decryption if SecretsManager is available
							let canDecryptGithub = false;
							let canDecryptOpenrouter = false;
							if (secrets) {
								try {
									const ghToken = await secrets.safeGetSecret(t.tenantId, "timeline_github_token");
									canDecryptGithub = !!ghToken;
								} catch {
									/* decryption failed */
								}
								try {
									const orKey = await secrets.safeGetSecret(t.tenantId, "timeline_openrouter_key");
									canDecryptOpenrouter = !!orKey;
								} catch {
									/* decryption failed */
								}
							}

							tenantSecretStatus.push({
								tenantId: t.tenantId,
								hasGithubSecret: secretKeys.has("timeline_github_token"),
								hasOpenrouterSecret: secretKeys.has("timeline_openrouter_key"),
								hasDEK: !!dekRow?.encrypted_dek,
								canDecryptGithub,
								canDecryptOpenrouter,
							});
						} catch {
							tenantSecretStatus.push({
								tenantId: t.tenantId,
								hasGithubSecret: false,
								hasOpenrouterSecret: false,
								hasDEK: false,
								canDecryptGithub: false,
								canDecryptOpenrouter: false,
							});
						}
					}
				}

				return Response.json({
					worker: "grove-timeline-sync",
					timestamp: new Date().toISOString(),
					cron: "0 1 * * * (1 AM UTC daily)",
					targetDate: getYesterdayUTC(),
					environment: {
						kekPresent,
						kekLength,
						kekValid: kekLength === 64,
						dbConnected,
					},
					secretsManager: {
						initialized: secretsManagerOk,
						error: secretsManagerError,
					},
					tenants: {
						enabledCount: tenantCount,
						configs: enabledTenants,
						secrets: tenantSecretStatus,
					},
				});
			} catch (err) {
				return Response.json(
					{
						worker: "grove-timeline-sync",
						error: err instanceof Error ? err.message : "Unknown error",
					},
					{ status: 500 },
				);
			}
		}

		// Health check
		return new Response("Grove Timeline Sync Worker", {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		});
	},
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Gate the manual-trigger/debug routes behind a bearer token.
 * Fails closed: if TIMELINE_ADMIN_KEY isn't configured, every gated route is
 * blocked rather than silently left open.
 * Set via: gw secret apply TIMELINE_ADMIN_KEY --worker grove-timeline-sync
 */
function requireAdminAuth(request: Request, env: Env): Response | null {
	if (!env.TIMELINE_ADMIN_KEY) {
		return Response.json(
			{
				success: false,
				error: "TIMELINE_ADMIN_KEY not configured — manual-trigger routes are disabled",
			},
			{ status: 503 },
		);
	}

	const authHeader = request.headers.get("Authorization");
	const [scheme, token] = authHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token || !timingSafeEqual(token, env.TIMELINE_ADMIN_KEY)) {
		return Response.json(
			{ success: false, error: "Unauthorized — use Authorization: Bearer <TIMELINE_ADMIN_KEY>" },
			{ status: 401 },
		);
	}

	return null;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
	const maxLength = Math.max(a.length, b.length);
	let result = a.length ^ b.length;
	for (let i = 0; i < maxLength; i++) {
		result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
	}
	return result === 0;
}

/**
 * Get yesterday's date in UTC (YYYY-MM-DD format).
 * The sync runs at 1 AM UTC, targeting the previous day's activity.
 */
function getYesterdayUTC(): string {
	const yesterday = new Date(Date.now() - 86400000);
	return yesterday.toISOString().split("T")[0];
}

/**
 * Log a summary of the sync results.
 */
function logResults(
	tenantIds: string[],
	results: PromiseSettledResult<GenerationResult>[],
	targetDate: string,
): void {
	let successful = 0;
	let failed = 0;
	let skipped = 0;
	let totalCommits = 0;

	results.forEach((result, i) => {
		if (result.status === "rejected") {
			failed++;
			console.error(`[Timeline Sync] ${tenantIds[i]}: Promise rejected -`, result.reason);
		} else if (!result.value.success) {
			failed++;
			console.error(`[Timeline Sync] ${tenantIds[i]}: Failed -`, result.value.error);
		} else if (result.value.commitCount === 0) {
			skipped++;
		} else {
			successful++;
			totalCommits += result.value.commitCount || 0;
		}
	});

	console.log(
		`[Timeline Sync] Complete for ${targetDate}: ${successful} successful, ${skipped} skipped (no commits), ${failed} failed. Total: ${totalCommits} commits.`,
	);
}
