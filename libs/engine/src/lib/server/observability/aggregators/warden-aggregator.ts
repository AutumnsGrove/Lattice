/**
 * Vista Observability — Warden API Gateway Aggregator
 *
 * Queries warden_audit_log for request volume, auth failure rates,
 * per-service latency, scope denials, nonce reuse attempts, and rate limit hits.
 *
 * Warden may not yet be deployed — if the table doesn't exist, returns
 * empty data gracefully with available=false.
 *
 * @module server/observability/aggregators/warden-aggregator
 */

import type { WardenAggregateResult, CollectorResult } from "../types.js";

/**
 * Aggregate Warden API gateway data from warden_audit_log.
 * Returns empty data gracefully if Warden is not yet deployed.
 */
export async function aggregateWarden(
	db: D1Database,
): Promise<CollectorResult & { data?: WardenAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	// Check if the warden_audit_log table exists first
	try {
		await db
			.prepare(`SELECT 1 FROM warden_audit_log LIMIT 1`)
			.first()
			.catch((err: unknown) => {
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
					throw new Error("WARDEN_NOT_DEPLOYED");
				}
				throw err;
			});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message === "WARDEN_NOT_DEPLOYED") {
			return {
				name: "warden-aggregator",
				status: "unavailable",
				itemsCollected: 0,
				durationMs: Date.now() - startedAt,
				data: buildEmptyWardenResult(collectedAt),
				error: "Warden not yet deployed — warden_audit_log table not found",
			};
		}
		// Other errors fall through
	}

	try {
		const [volumeResult, authBreakdownResult, perServiceResult, securityResult] =
			await Promise.allSettled([
				// Total request volume (24h)
				db
					.prepare(
						`SELECT
            COUNT(*) as total,
            SUM(CASE WHEN auth_result = 'failed' THEN 1 ELSE 0 END) as auth_failures
           FROM warden_audit_log
           WHERE created_at >= strftime('%s', 'now') - 86400`,
					)
					.first<{ total: number; auth_failures: number }>(),

				// Auth breakdown (24h): service-binding vs challenge-response vs failed
				db
					.prepare(
						`SELECT
            auth_method,
            COUNT(*) as count
           FROM warden_audit_log
           WHERE created_at >= strftime('%s', 'now') - 86400
           GROUP BY auth_method`,
					)
					.all<{ auth_method: string; count: number }>(),

				// Per-service latency (24h)
				db
					.prepare(
						`SELECT
            target_service,
            AVG(latency_ms) as avg_ms,
            COUNT(*) as count
           FROM warden_audit_log
           WHERE created_at >= strftime('%s', 'now') - 86400
           AND latency_ms IS NOT NULL
           GROUP BY target_service
           ORDER BY count DESC
           LIMIT 20`,
					)
					.all<{ target_service: string; avg_ms: number; count: number }>(),

				// Security signals (24h): nonce reuse, rate limit hits, scope denials
				db
					.prepare(
						`SELECT
            SUM(CASE WHEN event_type = 'nonce_reuse' THEN 1 ELSE 0 END) as nonce_reuse,
            SUM(CASE WHEN event_type = 'rate_limit_hit' THEN 1 ELSE 0 END) as rate_limit_hits,
            SUM(CASE WHEN event_type = 'scope_denial' THEN 1 ELSE 0 END) as scope_denials
           FROM warden_audit_log
           WHERE created_at >= strftime('%s', 'now') - 86400`,
					)
					.first<{ nonce_reuse: number; rate_limit_hits: number; scope_denials: number }>(),
			]);

		const volume = volumeResult.status === "fulfilled" ? volumeResult.value : null;
		const authRows =
			authBreakdownResult.status === "fulfilled" ? (authBreakdownResult.value.results ?? []) : [];
		const serviceRows =
			perServiceResult.status === "fulfilled" ? (perServiceResult.value.results ?? []) : [];
		const security = securityResult.status === "fulfilled" ? securityResult.value : null;

		const totalRequests = volume?.total ?? 0;
		const authFailures = volume?.auth_failures ?? 0;
		const authFailureRate = totalRequests > 0 ? (authFailures / totalRequests) * 100 : 0;

		// Map auth method breakdown
		const authMethodMap = new Map(authRows.map((r) => [r.auth_method, r.count]));

		const data: WardenAggregateResult = {
			available: true,
			requestVolume24h: totalRequests,
			authFailureRate24h: authFailureRate,
			authBreakdown24h: {
				serviceBinding: authMethodMap.get("service_binding") ?? 0,
				challengeResponse: authMethodMap.get("challenge_response") ?? 0,
				failed: authFailures,
			},
			perServiceLatency: serviceRows.map((r) => ({
				service: r.target_service,
				avgMs: r.avg_ms,
				count: r.count,
			})),
			nonceReuseAttempts24h: security?.nonce_reuse ?? 0,
			rateLimitHits24h: security?.rate_limit_hits ?? 0,
			scopeDenials24h: security?.scope_denials ?? 0,
			collectedAt,
		};

		return {
			name: "warden-aggregator",
			status: "success",
			itemsCollected: 1,
			durationMs: Date.now() - startedAt,
			data,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "warden-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Warden aggregation failed: ${message}`,
		};
	}
}

function buildEmptyWardenResult(collectedAt: number): WardenAggregateResult {
	return {
		available: false,
		requestVolume24h: 0,
		authFailureRate24h: 0,
		authBreakdown24h: {
			serviceBinding: 0,
			challengeResponse: 0,
			failed: 0,
		},
		perServiceLatency: [],
		nonceReuseAttempts24h: 0,
		rateLimitHits24h: 0,
		scopeDenials24h: 0,
		collectedAt,
	};
}
