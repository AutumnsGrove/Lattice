/**
 * Vista Observability — R2 Bucket Metrics Collector
 *
 * Queries the Cloudflare R2 API for bucket object counts and storage sizes.
 * Also queries R2 analytics for operation counts (Class A / Class B).
 * Fails open gracefully when CF_OBSERVABILITY_TOKEN is absent.
 *
 * Required token scope: Account Workers R2 Storage:Read
 *
 * @module server/observability/collectors/r2-collector
 */

import type { R2Metrics, CollectorResult } from "../types.js";
import { SERVICE_REGISTRY } from "../types.js";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";
const CF_GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

interface R2BucketUsageResponse {
	result?: {
		bucketId: string;
		name: string;
		objectCount?: number;
		storageSize?: number;
	};
	success?: boolean;
}

/**
 * Fetch R2 bucket metadata (object count, storage size) via R2 API.
 */
async function fetchR2BucketInfo(
	accountId: string,
	bucketName: string,
	token: string,
): Promise<{ objectCount: number; totalSizeBytes: number } | null> {
	try {
		// R2 bucket details endpoint
		const response = await fetch(`${CF_API_BASE}/accounts/${accountId}/r2/buckets/${bucketName}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) return null;

		const json = (await response.json()) as R2BucketUsageResponse;
		if (!json.success || !json.result) return null;

		return {
			objectCount: json.result.objectCount ?? 0,
			totalSizeBytes: json.result.storageSize ?? 0,
		};
	} catch {
		return null;
	}
}

/**
 * Fetch R2 operation analytics (Class A / Class B ops) via CF GraphQL.
 */
async function fetchR2Analytics(
	accountId: string,
	bucketName: string,
	token: string,
): Promise<{ classAOps: number; classBOps: number } | null> {
	try {
		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const datetimeStart = oneDayAgo.toISOString().replace(/\.\d{3}Z$/, "Z");
		const datetimeEnd = now.toISOString().replace(/\.\d{3}Z$/, "Z");

		const query = JSON.stringify({
			query: `{
        viewer {
          accounts(filter: { accountTag: "${accountId}" }) {
            r2StorageAdaptiveGroups(
              limit: 1
              filter: {
                bucketName: "${bucketName}"
                datetimeHour_geq: "${datetimeStart}"
                datetimeHour_leq: "${datetimeEnd}"
              }
            ) {
              sum {
                putRequests
                getRequests
                deleteRequests
                listRequests
                headRequests
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
						r2StorageAdaptiveGroups?: Array<{
							sum?: {
								putRequests: number;
								getRequests: number;
								deleteRequests: number;
								listRequests: number;
								headRequests: number;
							};
						}>;
					}>;
				};
			};
		};

		const groups = json.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups ?? [];
		const sum = groups[0]?.sum;

		if (!sum) return { classAOps: 0, classBOps: 0 };

		// Class A: PUT, DELETE, LIST (mutating/listing operations)
		const classAOps = (sum.putRequests ?? 0) + (sum.deleteRequests ?? 0) + (sum.listRequests ?? 0);
		// Class B: GET, HEAD (read operations)
		const classBOps = (sum.getRequests ?? 0) + (sum.headRequests ?? 0);

		return { classAOps, classBOps };
	} catch {
		return null;
	}
}

/**
 * Collect R2 bucket metrics from the Cloudflare API.
 * Queries all buckets in the SERVICE_REGISTRY in parallel using Promise.allSettled.
 */
export async function collectR2Metrics(
	accountId: string,
	token: string | undefined,
	db: D1Database,
): Promise<CollectorResult & { metrics?: R2Metrics[] }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	if (!token) {
		return {
			name: "r2-collector",
			status: "unavailable",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: "CF_OBSERVABILITY_TOKEN not configured",
		};
	}

	try {
		const results = await Promise.allSettled(
			SERVICE_REGISTRY.buckets.map(async (bucket) => {
				const [info, analytics] = await Promise.allSettled([
					fetchR2BucketInfo(accountId, bucket.name, token),
					fetchR2Analytics(accountId, bucket.name, token),
				]);

				const bucketInfo = info.status === "fulfilled" ? info.value : null;
				const bucketAnalytics = analytics.status === "fulfilled" ? analytics.value : null;

				return {
					bucket: bucket.name,
					objectCount: bucketInfo?.objectCount ?? 0,
					totalSizeBytes: bucketInfo?.totalSizeBytes ?? 0,
					classAOps: bucketAnalytics?.classAOps ?? 0,
					classBOps: bucketAnalytics?.classBOps ?? 0,
					collectedAt,
				} satisfies R2Metrics;
			}),
		);

		const metrics: R2Metrics[] = [];
		const errors: string[] = [];

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			const bucket = SERVICE_REGISTRY.buckets[i];

			if (result.status === "fulfilled") {
				metrics.push(result.value);

				// Write to D1
				await db
					.prepare(
						`INSERT INTO observability_r2_stats
              (bucket_name, object_count, total_size_bytes, class_a_ops, class_b_ops, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
					)
					.bind(
						result.value.bucket,
						result.value.objectCount,
						result.value.totalSizeBytes,
						result.value.classAOps,
						result.value.classBOps,
						collectedAt,
					)
					.run()
					.catch((err) => {
						console.error(`[R2 Collector] Failed to write stats for ${result.value.bucket}:`, err);
					});
			} else {
				errors.push(`${bucket.name}: ${result.reason}`);
			}
		}

		return {
			name: "r2-collector",
			status:
				errors.length === 0
					? "success"
					: errors.length < SERVICE_REGISTRY.buckets.length
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
			name: "r2-collector",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `R2 collection failed: ${message}`,
		};
	}
}
