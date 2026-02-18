/**
 * Vista Observability — D1 Database Metrics Collector
 *
 * Queries the Cloudflare D1 HTTP API for database sizes and row counts.
 * Fails open gracefully when CF_OBSERVABILITY_TOKEN is absent.
 *
 * Required token scope: Account D1:Read
 * API: https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}
 *
 * @module server/observability/collectors/d1-collector
 */

import type { D1Metrics, CollectorResult } from "../types.js";
import { SERVICE_REGISTRY } from "../types.js";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

interface D1DatabaseResponse {
	result?: {
		uuid: string;
		name: string;
		num_tables?: number;
		file_size?: number;
		running_in_region?: string;
		created_at?: string;
		version?: string;
	};
	success?: boolean;
	errors?: Array<{ message: string }>;
}

interface D1AnalyticsResponse {
	result?: {
		data?: Array<{
			rows_read: number;
			rows_written: number;
			query_count: number;
		}>;
	};
	success?: boolean;
	errors?: Array<{ message: string }>;
}

/**
 * Fetch D1 database metadata (size, table count) from the CF API.
 */
async function fetchD1DatabaseInfo(
	accountId: string,
	databaseId: string,
	token: string,
): Promise<{ sizeBytes: number; numTables: number } | null> {
	try {
		const response = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) return null;

		const json = (await response.json()) as D1DatabaseResponse;
		if (!json.success || !json.result) return null;

		return {
			sizeBytes: json.result.file_size ?? 0,
			numTables: json.result.num_tables ?? 0,
		};
	} catch {
		return null;
	}
}

/**
 * Fetch D1 analytics (rows read/written, query count) from the CF Analytics API.
 * Uses the D1 analytics endpoint which provides 24h aggregated stats.
 */
async function fetchD1Analytics(
	accountId: string,
	databaseId: string,
	token: string,
): Promise<{ rowsRead: number; rowsWritten: number; queryCount: number } | null> {
	try {
		// D1 analytics via GraphQL
		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const datetimeStart = oneDayAgo.toISOString().replace(/\.\d{3}Z$/, "Z");
		const datetimeEnd = now.toISOString().replace(/\.\d{3}Z$/, "Z");

		const query = JSON.stringify({
			query: `{
        viewer {
          accounts(filter: { accountTag: "${accountId}" }) {
            d1AnalyticsAdaptiveGroups(
              limit: 1
              filter: {
                databaseId: "${databaseId}"
                datetimeHour_geq: "${datetimeStart}"
                datetimeHour_leq: "${datetimeEnd}"
              }
            ) {
              sum {
                rowsRead
                rowsWritten
                queryCount
              }
            }
          }
        }
      }`,
		});

		const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
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
						d1AnalyticsAdaptiveGroups?: Array<{
							sum?: { rowsRead: number; rowsWritten: number; queryCount: number };
						}>;
					}>;
				};
			};
		};

		const groups = json.data?.viewer?.accounts?.[0]?.d1AnalyticsAdaptiveGroups ?? [];
		const sum = groups[0]?.sum;

		if (!sum) return { rowsRead: 0, rowsWritten: 0, queryCount: 0 };

		return {
			rowsRead: sum.rowsRead ?? 0,
			rowsWritten: sum.rowsWritten ?? 0,
			queryCount: sum.queryCount ?? 0,
		};
	} catch {
		return null;
	}
}

/**
 * Collect D1 database metrics from the Cloudflare API.
 * Queries all databases in the SERVICE_REGISTRY in parallel using Promise.allSettled.
 */
export async function collectD1Metrics(
	accountId: string,
	token: string | undefined,
	db: D1Database,
): Promise<CollectorResult & { metrics?: D1Metrics[] }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	if (!token) {
		return {
			name: "d1-collector",
			status: "unavailable",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: "CF_OBSERVABILITY_TOKEN not configured",
		};
	}

	try {
		// Skip placeholder IDs (databases that haven't been provisioned yet)
		const realDatabases = SERVICE_REGISTRY.databases.filter((db) => !db.databaseId.endsWith("-id"));

		const results = await Promise.allSettled(
			realDatabases.map(async (dbEntry) => {
				const [info, analytics] = await Promise.allSettled([
					fetchD1DatabaseInfo(accountId, dbEntry.databaseId, token),
					fetchD1Analytics(accountId, dbEntry.databaseId, token),
				]);

				const dbInfo = info.status === "fulfilled" ? info.value : null;
				const dbAnalytics = analytics.status === "fulfilled" ? analytics.value : null;

				return {
					name: dbEntry.name,
					databaseId: dbEntry.databaseId,
					sizeBytes: dbInfo?.sizeBytes ?? 0,
					rowsRead: dbAnalytics?.rowsRead ?? 0,
					rowsWritten: dbAnalytics?.rowsWritten ?? 0,
					queryCount: dbAnalytics?.queryCount ?? 0,
					collectedAt,
				} satisfies D1Metrics;
			}),
		);

		const metrics: D1Metrics[] = [];
		const errors: string[] = [];

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			const dbEntry = realDatabases[i];

			if (result.status === "fulfilled") {
				metrics.push(result.value);

				// Write to D1
				await db
					.prepare(
						`INSERT INTO observability_d1_stats
              (database_name, database_id, size_bytes, rows_read, rows_written, query_count, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
					)
					.bind(
						result.value.name,
						result.value.databaseId,
						result.value.sizeBytes,
						result.value.rowsRead,
						result.value.rowsWritten,
						result.value.queryCount,
						collectedAt,
					)
					.run()
					.catch((err) => {
						console.error(`[D1 Collector] Failed to write stats for ${result.value.name}:`, err);
					});
			} else {
				errors.push(`${dbEntry.name}: ${result.reason}`);
			}
		}

		return {
			name: "d1-collector",
			status:
				errors.length === 0
					? "success"
					: errors.length < realDatabases.length
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
			name: "d1-collector",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `D1 collection failed: ${message}`,
		};
	}
}
