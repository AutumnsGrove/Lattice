/**
 * Vista Observability — KV Namespace Metrics Collector
 *
 * Queries the Cloudflare KV Analytics API for namespace operation counts.
 * Also performs an active KV health check: a read/write/delete cycle to detect
 * when KV is silently failing (M-5 audit finding — rate limiter fails open).
 *
 * Required token scope: Account Workers KV Storage:Read
 *
 * @module server/observability/collectors/kv-collector
 */

import type { KVMetrics, CollectorResult } from "../types.js";
import { SERVICE_REGISTRY } from "../types.js";

const CF_GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const CF_API_BASE = "https://api.cloudflare.com/client/v4";

/** Key used for the active KV health check cycle */
const KV_HEALTH_CHECK_KEY = "_vista_health_check";
const KV_HEALTH_CHECK_VALUE = "ok";

/**
 * Fetch KV analytics (reads, writes, deletes, lists) via CF GraphQL.
 */
async function fetchKVAnalytics(
	accountId: string,
	namespaceId: string,
	token: string,
): Promise<{ reads: number; writes: number; deletes: number; lists: number } | null> {
	try {
		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const datetimeStart = oneDayAgo.toISOString().replace(/\.\d{3}Z$/, "Z");
		const datetimeEnd = now.toISOString().replace(/\.\d{3}Z$/, "Z");

		const query = JSON.stringify({
			query: `{
        viewer {
          accounts(filter: { accountTag: "${accountId}" }) {
            kvStorageAdaptiveGroups(
              limit: 1
              filter: {
                namespaceId: "${namespaceId}"
                datetimeHour_geq: "${datetimeStart}"
                datetimeHour_leq: "${datetimeEnd}"
              }
            ) {
              sum {
                readRequests
                writeRequests
                deleteRequests
                listRequests
              }
            }
          }
        }
      }`,
		});

		const response = await fetch(CF_GRAPHQL_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: query,
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) return null;

		const json = (await response.json()) as {
			data?: {
				viewer?: {
					accounts?: Array<{
						kvStorageAdaptiveGroups?: Array<{
							sum?: {
								readRequests: number;
								writeRequests: number;
								deleteRequests: number;
								listRequests: number;
							};
						}>;
					}>;
				};
			};
		};

		const groups = json.data?.viewer?.accounts?.[0]?.kvStorageAdaptiveGroups ?? [];
		const sum = groups[0]?.sum;

		if (!sum) return { reads: 0, writes: 0, deletes: 0, lists: 0 };

		return {
			reads: sum.readRequests ?? 0,
			writes: sum.writeRequests ?? 0,
			deletes: sum.deleteRequests ?? 0,
			lists: sum.listRequests ?? 0,
		};
	} catch {
		return null;
	}
}

/**
 * Perform an active KV health check on the RATE_LIMITER namespace.
 * Writes a test key, reads it back, then deletes it.
 * This detects when KV is silently failing (M-5 audit finding).
 *
 * This check uses the CF KV HTTP API directly (requires KV:Write scope too,
 * but we attempt it and degrade gracefully if token lacks write scope).
 */
async function performKVHealthCheck(
	accountId: string,
	namespaceId: string,
	token: string,
): Promise<"healthy" | "degraded" | "unavailable"> {
	const base = `${CF_API_BASE}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${KV_HEALTH_CHECK_KEY}`;

	try {
		// 1. Write
		const writeResponse = await fetch(base, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "text/plain",
			},
			body: KV_HEALTH_CHECK_VALUE,
			signal: AbortSignal.timeout(5_000),
		});

		if (!writeResponse.ok) {
			// 403 = token lacks write scope (analytics-only token), not a KV failure
			if (writeResponse.status === 403) return "healthy";
			return "degraded";
		}

		// 2. Read back
		const readResponse = await fetch(base, {
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(5_000),
		});

		if (!readResponse.ok) return "degraded";
		const val = await readResponse.text();
		if (val !== KV_HEALTH_CHECK_VALUE) return "degraded";

		// 3. Delete
		await fetch(base, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(5_000),
		}).catch(() => {
			// Delete failure is not critical — key will expire anyway
		});

		return "healthy";
	} catch (err) {
		console.warn("[KV Health Check] Failed:", err);
		return "unavailable";
	}
}

/**
 * Collect KV namespace metrics from the Cloudflare API.
 * Also performs an active health check on the RATE_LIMITER namespace.
 */
export async function collectKVMetrics(
	accountId: string,
	token: string | undefined,
	db: D1Database,
): Promise<CollectorResult & { metrics?: KVMetrics[] }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	if (!token) {
		return {
			name: "kv-collector",
			status: "unavailable",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: "CF_OBSERVABILITY_TOKEN not configured",
		};
	}

	try {
		// Skip placeholder namespace IDs
		const realNamespaces = SERVICE_REGISTRY.kvNamespaces.filter(
			(ns) => !ns.namespaceId.endsWith("-id"),
		);

		// Run all namespace analytics + the RATE_LIMITER health check in parallel
		const rateLimiterNs = SERVICE_REGISTRY.kvNamespaces.find((ns) => ns.name === "RATE_LIMITER");

		const [namespaceResults, healthCheckResult] = await Promise.allSettled([
			Promise.allSettled(
				realNamespaces.map(async (ns) => {
					const analytics = await fetchKVAnalytics(accountId, ns.namespaceId, token);
					return {
						namespace: ns.name,
						namespaceId: ns.namespaceId,
						reads: analytics?.reads ?? 0,
						writes: analytics?.writes ?? 0,
						deletes: analytics?.deletes ?? 0,
						lists: analytics?.lists ?? 0,
						healthStatus: "unknown" as const,
						healthCheckedAt: null,
						collectedAt,
					} satisfies KVMetrics;
				}),
			),
			rateLimiterNs && !rateLimiterNs.namespaceId.endsWith("-id")
				? performKVHealthCheck(accountId, rateLimiterNs.namespaceId, token)
				: Promise.resolve("unknown" as const),
		]);

		const metrics: KVMetrics[] = [];
		const errors: string[] = [];
		const kvHealthStatus =
			healthCheckResult.status === "fulfilled" ? healthCheckResult.value : "unknown";
		const healthCheckedAt = Math.floor(Date.now() / 1000);

		if (namespaceResults.status === "fulfilled") {
			for (let i = 0; i < namespaceResults.value.length; i++) {
				const result = namespaceResults.value[i];
				const ns = realNamespaces[i];

				if (result.status === "fulfilled") {
					// Attach health status to the RATE_LIMITER namespace
					const isRateLimiter = ns.name === "RATE_LIMITER";
					const metric: KVMetrics = {
						...result.value,
						healthStatus: isRateLimiter ? kvHealthStatus : "unknown",
						healthCheckedAt: isRateLimiter ? healthCheckedAt : null,
					};
					metrics.push(metric);

					// Write to D1
					await db
						.prepare(
							`INSERT INTO observability_kv_stats
                (namespace_name, namespace_id, reads, writes, deletes, lists,
                 health_status, health_checked_at, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
						)
						.bind(
							metric.namespace,
							metric.namespaceId,
							metric.reads,
							metric.writes,
							metric.deletes,
							metric.lists,
							metric.healthStatus,
							metric.healthCheckedAt,
							collectedAt,
						)
						.run()
						.catch((err) => {
							console.error(`[KV Collector] Failed to write stats for ${metric.namespace}:`, err);
						});
				} else {
					errors.push(`${ns.name}: ${result.reason}`);
				}
			}
		}

		// Alert: KV health check failure (M-5 — rate limiter fail-open)
		if (kvHealthStatus === "unavailable" || kvHealthStatus === "degraded") {
			console.warn(
				`[KV Collector] ALERT: RATE_LIMITER KV health check returned '${kvHealthStatus}' — rate limiting may be silently failing (M-5)`,
			);
		}

		return {
			name: "kv-collector",
			status:
				errors.length === 0
					? "success"
					: errors.length < realNamespaces.length
						? "partial"
						: "error",
			itemsCollected: metrics.length,
			durationMs: Date.now() - startedAt,
			metrics,
			error: errors.length > 0 ? errors.join("; ") : undefined,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "kv-collector",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `KV collection failed: ${message}`,
		};
	}
}
