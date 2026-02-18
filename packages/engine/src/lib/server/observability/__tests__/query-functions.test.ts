/**
 * Vista Observability — Query Function Tests
 *
 * Tests for the D1-backed query functions exported from index.ts:
 * - getObservabilityOverview
 * - getWorkerMetrics
 * - getAlerts
 * - getAlertThresholds
 * - upsertAlertThreshold
 *
 * All DB interactions are mocked. Tests verify the transformation logic
 * (snake_case → camelCase, boolean normalization, null handling) and
 * graceful degradation when DB is unavailable.
 */

import { describe, it, expect, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import {
	getObservabilityOverview,
	getWorkerMetrics,
	getAlerts,
	getAlertThresholds,
	upsertAlertThreshold,
} from "../index.js";

// =============================================================================
// Mock D1 factory
// =============================================================================

/**
 * Create a chainable D1 mock.
 * Usage:
 *   const db = createMockDb({ first: nullResult, all: emptyResults })
 *
 * The mock supports chained .prepare().bind().first() and .prepare().all().
 */
function createMockDb(
	overrides: {
		first?: () => Promise<unknown>;
		all?: () => Promise<{ results: unknown[] }>;
		run?: () => Promise<{ meta: { changes: number; last_row_id: number } }>;
	} = {},
): D1Database {
	const statement = {
		bind: vi.fn().mockReturnThis(),
		first: overrides.first ?? vi.fn().mockResolvedValue(null),
		all: overrides.all ?? vi.fn().mockResolvedValue({ results: [] }),
		run: overrides.run ?? vi.fn().mockResolvedValue({ meta: { changes: 1, last_row_id: 1 } }),
	};

	return {
		prepare: vi.fn().mockReturnValue(statement),
		batch: vi.fn(),
		dump: vi.fn(),
		exec: vi.fn(),
	} as unknown as D1Database;
}

// =============================================================================
// getObservabilityOverview
// =============================================================================

describe("getObservabilityOverview", () => {
	it("returns safe defaults when all DB queries fail", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockRejectedValue(new Error("DB offline")),
				all: vi.fn().mockRejectedValue(new Error("DB offline")),
			}),
		} as unknown as D1Database;

		const result = await getObservabilityOverview(db);
		expect(result.lastCollectionAt).toBeNull();
		expect(result.activeAlerts).toBe(0);
		expect(result.healthSummary).toEqual([]);
		expect(result.collectionTokenConfigured).toBe(false);
	});

	it("returns lastCollectionAt from DB", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ completed_at: 1700000000 }) // lastCollection
					.mockResolvedValueOnce({ count: 2 }), // activeAlerts
				all: vi.fn().mockResolvedValue({ results: [] }), // healthChecks
			}),
		} as unknown as D1Database;

		const result = await getObservabilityOverview(db);
		expect(result.lastCollectionAt).toBe(1700000000);
	});

	it("returns activeAlerts count from DB", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce(null) // no collection log
					.mockResolvedValueOnce({ count: 3 }), // 3 active alerts
				all: vi.fn().mockResolvedValue({ results: [] }),
			}),
		} as unknown as D1Database;

		const result = await getObservabilityOverview(db);
		expect(result.activeAlerts).toBe(3);
	});

	it("maps is_healthy integer (1) to boolean true", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({
					results: [
						{
							endpoint: "https://engine.grove.place/api/health",
							is_healthy: 1,
							checked_at: 1700000000,
						},
					],
				}),
			}),
		} as unknown as D1Database;

		const result = await getObservabilityOverview(db);
		expect(result.healthSummary).toHaveLength(1);
		expect(result.healthSummary[0].isHealthy).toBe(true);
		expect(result.healthSummary[0].endpoint).toBe("https://engine.grove.place/api/health");
	});

	it("maps is_healthy integer (0) to boolean false", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({
					results: [
						{
							endpoint: "https://degraded.grove.place/health",
							is_healthy: 0,
							checked_at: 1700000001,
						},
					],
				}),
			}),
		} as unknown as D1Database;

		const result = await getObservabilityOverview(db);
		expect(result.healthSummary[0].isHealthy).toBe(false);
	});

	it("collectionTokenConfigured is always false (set by API endpoint)", async () => {
		const db = createMockDb();
		const result = await getObservabilityOverview(db);
		expect(result.collectionTokenConfigured).toBe(false);
	});
});

// =============================================================================
// getWorkerMetrics
// =============================================================================

describe("getWorkerMetrics", () => {
	it("returns empty array when no metrics exist", async () => {
		const db = createMockDb({ all: vi.fn().mockResolvedValue({ results: [] }) });
		const result = await getWorkerMetrics(db);
		expect(result).toEqual([]);
	});

	it("returns empty array when DB query fails", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error("offline")),
			}),
		} as unknown as D1Database;

		const result = await getWorkerMetrics(db);
		expect(result).toEqual([]);
	});

	it("maps snake_case columns to camelCase", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({
					results: [
						{
							service_name: "grove-engine",
							metric_type: "error_rate",
							value: 0.02,
							recorded_at: 1700000000,
							metadata: null,
						},
					],
				}),
			}),
		} as unknown as D1Database;

		const result = await getWorkerMetrics(db);
		expect(result).toHaveLength(1);
		expect(result[0].serviceName).toBe("grove-engine");
		expect(result[0].metricType).toBe("error_rate");
		expect(result[0].value).toBe(0.02);
		expect(result[0].recordedAt).toBe(1700000000);
	});

	it("parses JSON metadata string into object", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({
					results: [
						{
							service_name: "grove-engine",
							metric_type: "latency_p99",
							value: 250,
							recorded_at: 1700000000,
							metadata: '{"worker":"grove-engine","region":"wnam"}',
						},
					],
				}),
			}),
		} as unknown as D1Database;

		const result = await getWorkerMetrics(db);
		expect(result[0].metadata).toEqual({ worker: "grove-engine", region: "wnam" });
	});

	it("returns null metadata when metadata column is null", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({
					results: [
						{
							service_name: "grove-engine",
							metric_type: "error_rate",
							value: 0,
							recorded_at: 1700000000,
							metadata: null,
						},
					],
				}),
			}),
		} as unknown as D1Database;

		const result = await getWorkerMetrics(db);
		expect(result[0].metadata).toBeNull();
	});

	it("passes hoursBack parameter to the query", async () => {
		const bindFn = vi.fn().mockReturnThis();
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: bindFn,
				all: vi.fn().mockResolvedValue({ results: [] }),
			}),
		} as unknown as D1Database;

		await getWorkerMetrics(db, 48);
		// The bind value should be approximately now - 48 * 3600 in epoch seconds
		expect(bindFn).toHaveBeenCalledTimes(1);
		const [epochArg] = bindFn.mock.calls[0];
		const expectedSince = Math.floor(Date.now() / 1000) - 48 * 3600;
		// Allow 5 seconds of slack for test execution time
		expect(Math.abs(epochArg - expectedSince)).toBeLessThan(5);
	});
});

// =============================================================================
// getAlerts
// =============================================================================

describe("getAlerts", () => {
	it("returns empty active and recent arrays when no alerts", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] }),
			}),
		} as unknown as D1Database;

		const result = await getAlerts(db);
		expect(result.active).toEqual([]);
		expect(result.recent).toEqual([]);
	});

	it("returns safe defaults when DB fails", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error("DB offline")),
			}),
		} as unknown as D1Database;

		const result = await getAlerts(db);
		expect(result.active).toEqual([]);
		expect(result.recent).toEqual([]);
	});

	it("maps acknowledged integer (1) to boolean true", async () => {
		const activeRow = {
			id: 1,
			service_name: "grove-engine",
			severity: "warning",
			title: "High error rate",
			description: "Error rate exceeded 5%",
			metric_type: "error_rate",
			metric_value: 0.06,
			threshold_value: 0.05,
			triggered_at: 1700000000,
			acknowledged: 1,
		};

		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi
					.fn()
					.mockResolvedValueOnce({ results: [activeRow] }) // active alerts
					.mockResolvedValueOnce({ results: [] }), // recent alerts
			}),
		} as unknown as D1Database;

		const result = await getAlerts(db);
		expect(result.active[0].acknowledged).toBe(true);
	});

	it("maps acknowledged integer (0) to boolean false", async () => {
		const activeRow = {
			id: 2,
			service_name: "grove-heartwood",
			severity: "critical",
			title: "Auth failures high",
			description: null,
			metric_type: "auth_failure_rate",
			metric_value: 0.15,
			threshold_value: 0.1,
			triggered_at: 1700000001,
			acknowledged: 0,
		};

		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi
					.fn()
					.mockResolvedValueOnce({ results: [activeRow] })
					.mockResolvedValueOnce({ results: [] }),
			}),
		} as unknown as D1Database;

		const result = await getAlerts(db);
		expect(result.active[0].acknowledged).toBe(false);
	});

	it("maps snake_case active alert fields to camelCase", async () => {
		const activeRow = {
			id: 3,
			service_name: "grove-cdn",
			severity: "info",
			title: "CDN latency elevated",
			description: "P95 above 800ms",
			metric_type: "latency_p95",
			metric_value: 820,
			threshold_value: 800,
			triggered_at: 1700000002,
			acknowledged: 0,
		};

		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi
					.fn()
					.mockResolvedValueOnce({ results: [activeRow] })
					.mockResolvedValueOnce({ results: [] }),
			}),
		} as unknown as D1Database;

		const result = await getAlerts(db);
		const alert = result.active[0];
		expect(alert.id).toBe(3);
		expect(alert.serviceName).toBe("grove-cdn");
		expect(alert.severity).toBe("info");
		expect(alert.metricType).toBe("latency_p95");
		expect(alert.metricValue).toBe(820);
		expect(alert.thresholdValue).toBe(800);
		expect(alert.triggeredAt).toBe(1700000002);
	});
});

// =============================================================================
// getAlertThresholds
// =============================================================================

describe("getAlertThresholds", () => {
	it("returns empty array when no thresholds exist", async () => {
		const db = createMockDb();
		const result = await getAlertThresholds(db);
		expect(result).toEqual([]);
	});

	it("returns empty array when DB fails", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				all: vi.fn().mockRejectedValue(new Error("offline")),
			}),
		} as unknown as D1Database;

		const result = await getAlertThresholds(db);
		expect(result).toEqual([]);
	});

	it("maps snake_case columns to camelCase", async () => {
		const row = {
			id: 1,
			service_name: "grove-engine",
			metric_type: "error_rate",
			operator: "gt",
			threshold_value: 0.05,
			severity: "warning",
			enabled: 1,
			created_at: 1700000000,
			updated_at: 1700000100,
		};

		const db = {
			prepare: vi.fn().mockReturnValue({
				all: vi.fn().mockResolvedValue({ results: [row] }),
			}),
		} as unknown as D1Database;

		const result = await getAlertThresholds(db);
		expect(result).toHaveLength(1);
		expect(result[0].serviceName).toBe("grove-engine");
		expect(result[0].metricType).toBe("error_rate");
		expect(result[0].operator).toBe("gt");
		expect(result[0].thresholdValue).toBe(0.05);
		expect(result[0].severity).toBe("warning");
		expect(result[0].createdAt).toBe(1700000000);
		expect(result[0].updatedAt).toBe(1700000100);
	});

	it("maps enabled integer (1) to boolean true", async () => {
		const row = {
			id: 1,
			service_name: "grove-engine",
			metric_type: "error_rate",
			operator: "gt",
			threshold_value: 0.05,
			severity: "warning",
			enabled: 1,
			created_at: 1700000000,
			updated_at: 1700000000,
		};

		const db = {
			prepare: vi.fn().mockReturnValue({
				all: vi.fn().mockResolvedValue({ results: [row] }),
			}),
		} as unknown as D1Database;

		const result = await getAlertThresholds(db);
		expect(result[0].enabled).toBe(true);
	});

	it("maps enabled integer (0) to boolean false", async () => {
		const row = {
			id: 2,
			service_name: "grove-engine",
			metric_type: "requests",
			operator: "lt",
			threshold_value: 1000,
			severity: "info",
			enabled: 0,
			created_at: 1700000000,
			updated_at: 1700000000,
		};

		const db = {
			prepare: vi.fn().mockReturnValue({
				all: vi.fn().mockResolvedValue({ results: [row] }),
			}),
		} as unknown as D1Database;

		const result = await getAlertThresholds(db);
		expect(result[0].enabled).toBe(false);
	});
});

// =============================================================================
// upsertAlertThreshold
// =============================================================================

describe("upsertAlertThreshold", () => {
	it("calls prepare with an INSERT...ON CONFLICT DO UPDATE statement", async () => {
		const prepareFn = vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockResolvedValue({ meta: { changes: 1, last_row_id: 1 } }),
		});
		const db = { prepare: prepareFn } as unknown as D1Database;

		await upsertAlertThreshold(db, {
			serviceName: "grove-engine",
			metricType: "error_rate",
			operator: "gt",
			thresholdValue: 0.05,
			severity: "warning",
		});

		expect(prepareFn).toHaveBeenCalledTimes(1);
		const sql = prepareFn.mock.calls[0][0] as string;
		expect(sql).toContain("INSERT INTO observability_alert_thresholds");
		expect(sql).toContain("ON CONFLICT");
		expect(sql).toContain("DO UPDATE SET");
	});

	it("binds all 8 required values including timestamps", async () => {
		const bindFn = vi.fn().mockReturnThis();
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: bindFn,
				run: vi.fn().mockResolvedValue({ meta: { changes: 1, last_row_id: 1 } }),
			}),
		} as unknown as D1Database;

		const before = Math.floor(Date.now() / 1000);
		await upsertAlertThreshold(db, {
			serviceName: "grove-engine",
			metricType: "error_rate",
			operator: "gt",
			thresholdValue: 0.05,
			severity: "warning",
		});
		const after = Math.floor(Date.now() / 1000);

		expect(bindFn).toHaveBeenCalledTimes(1);
		const args = bindFn.mock.calls[0] as unknown[];
		// args: serviceName, metricType, operator, thresholdValue, severity, enabled, created_at, updated_at
		expect(args[0]).toBe("grove-engine");
		expect(args[1]).toBe("error_rate");
		expect(args[2]).toBe("gt");
		expect(args[3]).toBe(0.05);
		expect(args[4]).toBe("warning");
		// enabled defaults to 1 when not specified
		expect(args[5]).toBe(1);
		// created_at and updated_at should be current epoch
		expect(args[6]).toBeGreaterThanOrEqual(before);
		expect(args[6]).toBeLessThanOrEqual(after);
		expect(args[7]).toBeGreaterThanOrEqual(before);
		expect(args[7]).toBeLessThanOrEqual(after);
	});

	it("sets enabled=1 when enabled is not provided", async () => {
		const bindFn = vi.fn().mockReturnThis();
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: bindFn,
				run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
			}),
		} as unknown as D1Database;

		await upsertAlertThreshold(db, {
			serviceName: "grove-engine",
			metricType: "requests",
			operator: "gt",
			thresholdValue: 1000,
			severity: "info",
			// enabled not specified
		});

		const args = bindFn.mock.calls[0] as unknown[];
		expect(args[5]).toBe(1);
	});

	it("sets enabled=0 when enabled=false", async () => {
		const bindFn = vi.fn().mockReturnThis();
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: bindFn,
				run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
			}),
		} as unknown as D1Database;

		await upsertAlertThreshold(db, {
			serviceName: "grove-engine",
			metricType: "requests",
			operator: "gt",
			thresholdValue: 1000,
			severity: "info",
			enabled: false,
		});

		const args = bindFn.mock.calls[0] as unknown[];
		expect(args[5]).toBe(0);
	});

	it("sets enabled=1 when enabled=true", async () => {
		const bindFn = vi.fn().mockReturnThis();
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: bindFn,
				run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
			}),
		} as unknown as D1Database;

		await upsertAlertThreshold(db, {
			serviceName: "grove-engine",
			metricType: "requests",
			operator: "lte",
			thresholdValue: 500,
			severity: "critical",
			enabled: true,
		});

		const args = bindFn.mock.calls[0] as unknown[];
		expect(args[5]).toBe(1);
	});
});
