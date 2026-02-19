/**
 * Vista Observability — Worker HTTP Health Checker
 *
 * Pings /health endpoints on all HTTP-accessible workers in the SERVICE_REGISTRY.
 * Records latency, status code, and health classification.
 *
 * Latency classification:
 * - operational:    < 500ms
 * - degraded:       500–1500ms
 * - partial_outage: 1500–3000ms
 * - major_outage:   > 3000ms or error/non-2xx response
 *
 * @module server/observability/collectors/health-checker
 */

import type { HealthCheckResult, HealthStatus, CollectorResult } from "../types.js";
import { SERVICE_REGISTRY } from "../types.js";

/** Timeout for each health check in milliseconds */
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

/**
 * Classify a response time into a HealthStatus.
 */
function classifyLatency(responseTimeMs: number, isHealthy: boolean): HealthStatus {
	if (!isHealthy) return "major_outage";
	if (responseTimeMs < 500) return "operational";
	if (responseTimeMs < 1500) return "degraded";
	if (responseTimeMs < 3000) return "partial_outage";
	return "major_outage";
}

/**
 * Ping a single worker's health endpoint and return the result.
 * Never throws — always returns a result (even on network failure).
 */
async function checkWorkerHealth(
	workerName: string,
	healthUrl: string,
): Promise<HealthCheckResult> {
	const checkedAt = Math.floor(Date.now() / 1000);
	const startMs = Date.now();

	try {
		const response = await fetch(healthUrl, {
			method: "GET",
			headers: {
				"User-Agent": "Grove-Vista-Health-Checker/1.0",
				Accept: "application/json, text/plain, */*",
			},
			signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
		});

		const responseTimeMs = Date.now() - startMs;
		const isHealthy = response.status >= 200 && response.status < 300;
		const status = classifyLatency(responseTimeMs, isHealthy);

		return {
			endpoint: workerName,
			workerName,
			statusCode: response.status,
			responseTimeMs,
			isHealthy,
			status,
			errorMessage: isHealthy ? null : `HTTP ${response.status}`,
			checkedAt,
		};
	} catch (err) {
		const responseTimeMs = Date.now() - startMs;
		const message = err instanceof Error ? err.message : String(err);

		// Distinguish timeout from other network errors
		const isTimeout = message.includes("timeout") || message.includes("AbortError");

		return {
			endpoint: workerName,
			workerName,
			statusCode: null,
			responseTimeMs,
			isHealthy: false,
			status: "major_outage",
			errorMessage: isTimeout
				? `Health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`
				: `Network error: ${message.slice(0, 200)}`,
			checkedAt,
		};
	}
}

/**
 * Run health checks on all HTTP-accessible workers in the SERVICE_REGISTRY.
 * All checks run in parallel using Promise.allSettled — one failure never cascades.
 * Results are written to the observability_health_checks D1 table.
 */
export async function runHealthChecks(
	db: D1Database,
): Promise<CollectorResult & { results?: HealthCheckResult[] }> {
	const startedAt = Date.now();

	// Only check workers that have HTTP health check URLs
	const httpWorkers = SERVICE_REGISTRY.workers.filter(
		(w) => w.hasHttp && w.healthCheckUrl !== null,
	);

	try {
		const checkResults = await Promise.allSettled(
			httpWorkers.map((worker) => checkWorkerHealth(worker.name, worker.healthCheckUrl!)),
		);

		const results: HealthCheckResult[] = [];
		const errors: string[] = [];

		for (let i = 0; i < checkResults.length; i++) {
			const result = checkResults[i];
			const worker = httpWorkers[i];

			if (result.status === "fulfilled") {
				results.push(result.value);

				// Write to D1
				await db
					.prepare(
						`INSERT INTO observability_health_checks
              (endpoint, status_code, response_time_ms, is_healthy, error_message, checked_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
					)
					.bind(
						result.value.endpoint,
						result.value.statusCode,
						result.value.responseTimeMs,
						result.value.isHealthy ? 1 : 0,
						result.value.errorMessage,
						result.value.checkedAt,
					)
					.run()
					.catch((err) => {
						console.error(
							`[Health Checker] Failed to write result for ${result.value.endpoint}:`,
							err,
						);
					});
			} else {
				// Promise.allSettled should never reject since checkWorkerHealth never throws,
				// but handle it gracefully anyway.
				errors.push(`${worker.name}: ${result.reason}`);
			}
		}

		const healthyCount = results.filter((r) => r.isHealthy).length;
		const unhealthyCount = results.length - healthyCount;

		if (unhealthyCount > 0) {
			console.warn(
				`[Health Checker] ${unhealthyCount}/${results.length} workers unhealthy: ` +
					results
						.filter((r) => !r.isHealthy)
						.map((r) => `${r.workerName}(${r.status})`)
						.join(", "),
			);
		}

		return {
			name: "health-checker",
			status: errors.length === 0 ? "success" : "partial",
			itemsCollected: results.length,
			durationMs: Date.now() - startedAt,
			results,
			error: errors.length > 0 ? errors.join("; ") : undefined,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "health-checker",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Health check collection failed: ${message}`,
		};
	}
}

/**
 * Get the latest health check result for each worker from D1.
 * Used by the API endpoints to serve current status without triggering a new check.
 */
export async function getLatestHealthChecks(db: D1Database): Promise<
	Array<{
		endpoint: string;
		statusCode: number | null;
		responseTimeMs: number | null;
		isHealthy: boolean;
		status: HealthStatus;
		errorMessage: string | null;
		checkedAt: number;
	}>
> {
	try {
		// Get the most recent check per endpoint
		const result = await db
			.prepare(
				`SELECT
          endpoint,
          status_code,
          response_time_ms,
          is_healthy,
          error_message,
          checked_at
         FROM observability_health_checks h1
         WHERE checked_at = (
           SELECT MAX(h2.checked_at)
           FROM observability_health_checks h2
           WHERE h2.endpoint = h1.endpoint
         )
         ORDER BY endpoint`,
			)
			.all<{
				endpoint: string;
				status_code: number | null;
				response_time_ms: number | null;
				is_healthy: number;
				error_message: string | null;
				checked_at: number;
			}>();

		return (result.results ?? []).map((row) => ({
			endpoint: row.endpoint,
			statusCode: row.status_code,
			responseTimeMs: row.response_time_ms,
			isHealthy: row.is_healthy === 1,
			status: classifyLatency(row.response_time_ms ?? 9999, row.is_healthy === 1),
			errorMessage: row.error_message,
			checkedAt: row.checked_at,
		}));
	} catch (err) {
		console.error("[Health Checker] Failed to fetch latest results:", err);
		return [];
	}
}
