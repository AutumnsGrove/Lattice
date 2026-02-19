/**
 * Vista Observability — Cloudflare Analytics GraphQL Collector
 *
 * Queries the Cloudflare Analytics GraphQL API for Worker request/error/latency
 * metrics. Requires CF_OBSERVABILITY_TOKEN and CF_ACCOUNT_ID.
 *
 * Fails open gracefully: when the token is absent, returns an unavailable status
 * with no throw. When the API is unreachable, returns an error status.
 *
 * API endpoint: https://api.cloudflare.com/client/v4/graphql
 * Required scopes: Account Analytics:Read
 *
 * @module server/observability/collectors/cloudflare-analytics
 */

import type { WorkerMetrics, CollectorResult } from "../types.js";
import { SERVICE_REGISTRY } from "../types.js";

const CF_GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

interface WorkerAnalyticsRow {
	scriptName: string;
	sum: {
		requests: number;
		errors: number;
		subrequests: number;
	};
	quantiles: {
		cpuTimeP50: number;
		cpuTimeP95: number;
		cpuTimeP99: number;
		durationP50: number;
		durationP95: number;
		durationP99: number;
	};
}

interface GraphQLResponse {
	data?: {
		viewer?: {
			accounts?: Array<{
				workersAnalyticsEngineAdaptiveGroups?: WorkerAnalyticsRow[];
			}>;
		};
	};
	errors?: Array<{ message: string }>;
}

/**
 * Build the GraphQL query for worker metrics over the last hour.
 * Uses the workersAnalyticsEngineAdaptiveGroups dataset.
 */
function buildWorkerMetricsQuery(accountId: string): string {
	const now = new Date();
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

	const datetimeStart = oneHourAgo.toISOString().replace(/\.\d{3}Z$/, "Z");
	const datetimeEnd = now.toISOString().replace(/\.\d{3}Z$/, "Z");

	return JSON.stringify({
		query: `{
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          workersAnalyticsEngineAdaptiveGroups(
            limit: 100
            filter: {
              datetimeHour_geq: "${datetimeStart}"
              datetimeHour_leq: "${datetimeEnd}"
            }
            orderBy: [sum_requests_DESC]
          ) {
            scriptName: dimensions { scriptName }
            sum {
              requests
              errors
              subrequests
            }
            quantiles {
              cpuTimeP50
              cpuTimeP95
              cpuTimeP99
              durationP50
              durationP95
              durationP99
            }
          }
        }
      }
    }`,
	});
}

/**
 * Collect worker metrics from the Cloudflare Analytics GraphQL API.
 * Returns WorkerMetrics[] for all known workers.
 * Returns { status: 'unavailable' } if CF_OBSERVABILITY_TOKEN is absent.
 */
export async function collectWorkerMetrics(
	accountId: string,
	token: string | undefined,
	db: D1Database,
): Promise<CollectorResult & { metrics?: WorkerMetrics[] }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	// Graceful fail-open: token not configured yet
	if (!token) {
		return {
			name: "cloudflare-analytics",
			status: "unavailable",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: "CF_OBSERVABILITY_TOKEN not configured — connect token to see live metrics",
		};
	}

	try {
		const query = buildWorkerMetricsQuery(accountId);

		const response = await fetch(CF_GRAPHQL_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: query,
			signal: AbortSignal.timeout(15_000), // 15 second timeout
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			return {
				name: "cloudflare-analytics",
				status: "error",
				itemsCollected: 0,
				durationMs: Date.now() - startedAt,
				error: `CF GraphQL API returned ${response.status}: ${text.slice(0, 200)}`,
			};
		}

		const json = (await response.json()) as GraphQLResponse;

		if (json.errors && json.errors.length > 0) {
			return {
				name: "cloudflare-analytics",
				status: "error",
				itemsCollected: 0,
				durationMs: Date.now() - startedAt,
				error: `CF GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`,
			};
		}

		const rows = json.data?.viewer?.accounts?.[0]?.workersAnalyticsEngineAdaptiveGroups ?? [];

		const metrics: WorkerMetrics[] = [];

		for (const row of rows) {
			const name = row.scriptName;
			const total = row.sum.requests ?? 0;
			const error = row.sum.errors ?? 0;
			const success = total - error;
			const errorRate = total > 0 ? (error / total) * 100 : 0;

			const metric: WorkerMetrics = {
				name,
				requests: { total, success, error },
				errorRate,
				latency: {
					p50: row.quantiles.durationP50 ?? 0,
					p95: row.quantiles.durationP95 ?? 0,
					p99: row.quantiles.durationP99 ?? 0,
				},
				cpuTimeAvg: row.quantiles.cpuTimeP50 ?? 0,
				durationAvg: row.quantiles.durationP50 ?? 0,
				collectedAt,
			};

			metrics.push(metric);

			// Write to D1 observability_metrics table
			await db
				.prepare(
					`INSERT INTO observability_metrics
            (service_name, metric_type, value, unit, recorded_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					name,
					"worker_requests",
					total,
					"count",
					collectedAt,
					JSON.stringify({
						success,
						error,
						errorRate,
						p50: metric.latency.p50,
						p95: metric.latency.p95,
						p99: metric.latency.p99,
					}),
				)
				.run()
				.catch((err) => {
					console.error(`[CF Analytics] Failed to write metric for ${name}:`, err);
				});
		}

		// For known workers with no data (zero traffic), still record a zero row
		// to distinguish "healthy zero" from "no data" we differentiate via metadata.is_known
		for (const worker of SERVICE_REGISTRY.workers) {
			if (!rows.find((r) => r.scriptName === worker.scriptName)) {
				const knownZero: WorkerMetrics = {
					name: worker.scriptName,
					requests: { total: 0, success: 0, error: 0 },
					errorRate: 0,
					latency: { p50: 0, p95: 0, p99: 0 },
					cpuTimeAvg: 0,
					durationAvg: 0,
					collectedAt,
				};
				metrics.push(knownZero);
			}
		}

		return {
			name: "cloudflare-analytics",
			status: "success",
			itemsCollected: rows.length,
			durationMs: Date.now() - startedAt,
			metrics,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "cloudflare-analytics",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `CF Analytics collection failed: ${message}`,
		};
	}
}
