/**
 * SentinelDO Tests
 *
 * Tests the stress test coordination DO — start, cancel, status,
 * and the alarm-driven batch execution loop.
 * Heavy internal deps (executeOperation, profiles) are mocked.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SentinelDO } from "./SentinelDO";
import {
	createTestDOState,
	createMockSql,
	createMockD1,
	createMockR2,
	createMockKV,
	doRequest,
	doPost,
	type MockD1,
} from "../test-helpers";

// Mock the heavy operation dependencies
vi.mock("./operations.js", () => ({
	executeOperation: vi.fn(async () => ({
		success: true,
		latencyMs: 15,
		operationName: "test_op",
	})),
}));

vi.mock("./profiles.js", () => ({
	getOpsPerSecondAt: vi.fn(() => 5),
	selectWeightedSystem: vi.fn(() => "d1_reads"),
}));

vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-sentinel" });

function createSentinelDO(existingState?: Record<string, unknown> | null) {
	const sql = createMockSql();
	const { state, storage } = createTestDOState("sentinel:tenant-1:run-1", sql);
	const db = createMockD1();

	if (existingState) {
		storage._kv.set("runState", existingState);
	}

	const env = {
		DB: db as unknown as D1Database,
		KV: createMockKV() as unknown as KVNamespace,
		IMAGES: createMockR2() as unknown as R2Bucket,
	};

	const doInstance = new SentinelDO(state, env);
	return { doInstance, sql, db, storage, env };
}

const sampleProfile = {
	type: "sustained" as const,
	targetOperations: 100,
	durationSeconds: 30,
	concurrency: 5,
	targetSystems: ["d1_reads" as const],
};

describe("SentinelDO", () => {
	describe("POST /start", () => {
		it("should initialize test run and set status to running", async () => {
			const { doInstance, db } = createSentinelDO();

			// D1 update for run status
			db._pushResult({ meta: { changes: 1 } });

			const res = await doInstance.fetch(
				doPost("/start", {
					runId: "run-1",
					tenantId: "tenant-1",
					profile: sampleProfile,
				}),
			);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.status).toBe("running");
		});
	});

	describe("GET /status", () => {
		it("should return idle when no test running", async () => {
			const { doInstance } = createSentinelDO();

			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();

			expect(body.status).toBe("idle");
		});

		it("should return running status with progress", async () => {
			const { doInstance } = createSentinelDO({
				runId: "run-1",
				tenantId: "tenant-1",
				profile: sampleProfile,
				status: "running",
				startedAt: Date.now() - 15000, // 15 seconds ago
				completedOps: 50,
				failedOps: 2,
				lastCheckpointAt: Date.now(),
				metricsBuffer: [],
				latencies: [],
				metricsFlushRetries: 0,
			});

			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();

			expect(body.status).toBe("running");
			expect(body.runId).toBe("run-1");
			expect(body.completedOps).toBe(50);
			expect(body.failedOps).toBe(2);
			expect(body.progress).toBeGreaterThan(0);
		});
	});

	describe("POST /cancel", () => {
		it("should cancel running test", async () => {
			const { doInstance, db } = createSentinelDO({
				runId: "run-1",
				tenantId: "tenant-1",
				profile: sampleProfile,
				status: "running",
				startedAt: Date.now(),
				completedOps: 10,
				failedOps: 0,
				lastCheckpointAt: Date.now(),
				metricsBuffer: [],
				latencies: [],
				metricsFlushRetries: 0,
			});

			// D1 update for cancel
			db._pushResult({ meta: { changes: 1 } });

			const res = await doInstance.fetch(doPost("/cancel", {}));
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.status).toBe("cancelled");
		});

		it("should return 400 when no active test", async () => {
			const { doInstance } = createSentinelDO();

			const res = await doInstance.fetch(doPost("/cancel", {}));
			expect(res.status).toBe(400);
		});
	});

	describe("alarm (batch execution)", () => {
		it("should not execute when not running", async () => {
			const { doInstance } = createSentinelDO();
			await expect(doInstance.alarm()).resolves.not.toThrow();
		});

		it("should not execute when status is cancelled", async () => {
			const { doInstance } = createSentinelDO({
				runId: "run-1",
				tenantId: "tenant-1",
				profile: sampleProfile,
				status: "cancelled",
				startedAt: Date.now(),
				completedOps: 0,
				failedOps: 0,
				lastCheckpointAt: Date.now(),
				metricsBuffer: [],
				latencies: [],
				metricsFlushRetries: 0,
			});

			await expect(doInstance.alarm()).resolves.not.toThrow();
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const { doInstance } = createSentinelDO();
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});
	});
});
