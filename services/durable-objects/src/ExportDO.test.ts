/**
 * ExportDO Tests
 *
 * Tests the export state machine — start, status, cancel,
 * and the phase dispatcher alarm handler.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExportDO } from "./ExportDO";
import {
	createTestDOState,
	createMockSql,
	createMockD1,
	createMockR2,
	createMockKV,
	doRequest,
	doPost,
	type MockD1,
} from "./test-helpers";

function createExportDO(existingState?: Record<string, unknown> | null) {
	const sql = createMockSql();
	const { state, storage } = createTestDOState("export:tenant-1:exp-1", sql);
	const db = createMockD1();
	const images = createMockR2();
	const exportsBucket = createMockR2();
	const kv = createMockKV();

	// ExportDO uses blockOnInit: false, so loadState is lazy.
	// loadState reads from state.storage.get("jobState")
	if (existingState) {
		storage._kv.set("jobState", existingState);
	}

	const env = {
		DB: db as unknown as D1Database,
		KV: kv as unknown as KVNamespace,
		IMAGES: images as unknown as R2Bucket,
		EXPORTS_BUCKET: exportsBucket as unknown as R2Bucket,
		ZEPHYR: {
			fetch: vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })),
		},
		ZEPHYR_API_KEY: "test-key",
	};

	const doInstance = new ExportDO(state, env);
	return { doInstance, sql, db, storage, images, exportsBucket, env };
}

describe("ExportDO", () => {
	describe("POST /start", () => {
		it("should initialize export job and transition to querying", async () => {
			const { doInstance, db } = createExportDO();

			// D1 update for status change
			db._pushResult({ meta: { changes: 1 } });

			const res = await doInstance.fetch(
				doPost("/start", {
					exportId: "exp-1",
					tenantId: "tenant-1",
					userEmail: "user@example.com",
					username: "autumn",
					includeImages: true,
					deliveryMethod: "email",
				}),
			);
			const body = await res.json();

			expect(res.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.phase).toBe("querying");
		});
	});

	describe("GET /status", () => {
		it("should return idle when no job exists", async () => {
			const { doInstance } = createExportDO();

			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();

			expect(body.status).toBe("idle");
		});

		it("should return job status when active", async () => {
			const { doInstance } = createExportDO({
				exportId: "exp-1",
				tenantId: "tenant-1",
				phase: "assembling",
				progress: 45,
			});

			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();

			expect(body.exportId).toBe("exp-1");
			expect(body.phase).toBe("assembling");
			expect(body.progress).toBe(45);
		});
	});

	describe("POST /cancel", () => {
		it("should cancel active export", async () => {
			const { doInstance, db, storage } = createExportDO({
				exportId: "exp-1",
				tenantId: "tenant-1",
				phase: "assembling",
				progress: 30,
			});

			// D1 update for cancel
			db._pushResult({ meta: { changes: 1 } });

			const res = await doInstance.fetch(doPost("/cancel", {}));
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.status).toBe("cancelled");
		});

		it("should return 400 when no active export", async () => {
			const { doInstance } = createExportDO();

			const res = await doInstance.fetch(doPost("/cancel", {}));
			const body = await res.json();

			expect(res.status).toBe(400);
			expect(body.success).toBe(false);
		});
	});

	describe("alarm (phase dispatcher)", () => {
		it("should skip alarm when no job state", async () => {
			const { doInstance } = createExportDO();

			// Should not throw
			await expect(doInstance.alarm()).resolves.not.toThrow();
		});

		it("should skip alarm when job is complete", async () => {
			const { doInstance } = createExportDO({
				exportId: "exp-1",
				tenantId: "tenant-1",
				phase: "complete",
				progress: 100,
			});

			await expect(doInstance.alarm()).resolves.not.toThrow();
		});

		it("should skip alarm when job is failed", async () => {
			const { doInstance } = createExportDO({
				exportId: "exp-1",
				tenantId: "tenant-1",
				phase: "failed",
				progress: 30,
				errorMessage: "Something went wrong",
			});

			await expect(doInstance.alarm()).resolves.not.toThrow();
		});
	});

	describe("error handling", () => {
		it("should set phase to failed on error during alarm", async () => {
			const { doInstance, db, storage } = createExportDO({
				exportId: "exp-1",
				tenantId: "tenant-1",
				phase: "querying",
				progress: 0,
				imageOffset: 0,
				skippedImages: [],
				itemCounts: { posts: 0, pages: 0, images: 0 },
				userEmail: "user@example.com",
				username: "autumn",
				includeImages: false,
				deliveryMethod: "download",
			});

			// Trigger lazy init so state_data is loaded from KV
			// (ExportDO uses blockOnInit:false — alarm() doesn't trigger init)
			await doInstance.fetch(doRequest("/status"));

			// Querying phase: D1 queries will throw because no results pushed
			db._pushError(new Error("DB connection lost"));

			await doInstance.alarm();

			// After error, check status shows failed
			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();
			expect(body.phase).toBe("failed");
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const { doInstance } = createExportDO();
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});
	});
});
