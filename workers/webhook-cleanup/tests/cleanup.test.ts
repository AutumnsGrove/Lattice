/**
 * Tests for webhook-cleanup worker using Infra SDK mock context.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanupExpiredExports, cleanupExpiredWebhooks } from "../src/index.js";
import type { GroveContext } from "@autumnsgrove/infra";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

function createTestContext(overrides?: {
	executeResults?: Array<{
		results: unknown[];
		meta: {
			changes: number;
			duration: number;
			last_row_id: number;
			rows_read: number;
			rows_written: number;
		};
	}>;
	storageDeleteFn?: (key: string) => Promise<void>;
}): GroveContext {
	const executeResults = overrides?.executeResults ?? [
		{
			results: [],
			meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 0, rows_written: 0 },
		},
	];
	let callIndex = 0;

	return {
		db: {
			execute: vi.fn().mockImplementation(() => {
				const result = executeResults[callIndex] ?? executeResults[executeResults.length - 1];
				callIndex++;
				return Promise.resolve(result);
			}),
			batch: vi.fn(),
			prepare: vi.fn(),
			transaction: vi.fn(),
			info: () => ({ provider: "test", database: "test", readonly: false }),
		},
		storage: {
			put: vi.fn(),
			get: vi.fn(),
			head: vi.fn(),
			delete: overrides?.storageDeleteFn ?? vi.fn().mockResolvedValue(undefined),
			deleteMany: vi.fn(),
			list: vi.fn(),
			presignedUrl: vi.fn(),
			info: () => ({ provider: "test", bucket: "test" }),
		},
		kv: {
			get: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
			list: vi.fn(),
			getWithMetadata: vi.fn(),
			info: () => ({ provider: "test", namespace: "test" }),
		},
		services: {
			call: vi.fn(),
			ping: vi.fn(),
			services: () => [],
			info: () => ({ provider: "test", services: [] }),
		},
		scheduler: {
			on: vi.fn(),
			schedules: () => [],
			info: () => ({ provider: "test" }),
		},
		config: {
			require: vi.fn(),
			get: vi.fn(),
			getOrDefault: vi.fn(),
			has: vi.fn(),
			info: () => ({ provider: "test" }),
		},
	};
}

describe("cleanupExpiredExports", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should delete R2 objects and mark exports as expired", async () => {
		const storageDel = vi.fn().mockResolvedValue(undefined);
		const meta = { changes: 1, duration: 1, last_row_id: 0, rows_read: 1, rows_written: 1 };

		const ctx = createTestContext({
			executeResults: [
				// SELECT expired exports
				{
					results: [
						{ id: "exp-1", r2_key: "exports/exp-1.zip" },
						{ id: "exp-2", r2_key: "exports/exp-2.zip" },
					],
					meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 2, rows_written: 0 },
				},
				// UPDATE exp-1
				{ results: [], meta },
				// UPDATE exp-2
				{ results: [], meta },
			],
			storageDeleteFn: storageDel,
		});

		const cleaned = await cleanupExpiredExports(ctx);

		expect(cleaned).toBe(2);
		expect(storageDel).toHaveBeenCalledTimes(2);
		expect(storageDel).toHaveBeenCalledWith("exports/exp-1.zip");
		expect(storageDel).toHaveBeenCalledWith("exports/exp-2.zip");
		expect(ctx.db.execute).toHaveBeenCalledTimes(3); // 1 SELECT + 2 UPDATEs
	});

	it("should continue cleaning when individual exports fail", async () => {
		const storageDel = vi
			.fn()
			.mockRejectedValueOnce(new Error("R2 timeout"))
			.mockResolvedValueOnce(undefined);
		const meta = { changes: 1, duration: 1, last_row_id: 0, rows_read: 1, rows_written: 1 };

		const ctx = createTestContext({
			executeResults: [
				{
					results: [
						{ id: "exp-fail", r2_key: "exports/fail.zip" },
						{ id: "exp-ok", r2_key: "exports/ok.zip" },
					],
					meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 2, rows_written: 0 },
				},
				// UPDATE for exp-ok (exp-fail throws before reaching UPDATE)
				{ results: [], meta },
			],
			storageDeleteFn: storageDel,
		});

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const cleaned = await cleanupExpiredExports(ctx);
		consoleSpy.mockRestore();

		// exp-fail errors, but exp-ok succeeds
		expect(cleaned).toBe(1);
		expect(storageDel).toHaveBeenCalledTimes(2);
	});

	it("should handle no expired exports gracefully", async () => {
		const ctx = createTestContext({
			executeResults: [
				{
					results: [],
					meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 0, rows_written: 0 },
				},
			],
		});

		const cleaned = await cleanupExpiredExports(ctx);

		expect(cleaned).toBe(0);
		expect(ctx.db.execute).toHaveBeenCalledTimes(1);
	});

	it("should skip R2 delete when r2_key is null", async () => {
		const storageDel = vi.fn();
		const meta = { changes: 1, duration: 1, last_row_id: 0, rows_read: 1, rows_written: 1 };

		const ctx = createTestContext({
			executeResults: [
				{
					results: [{ id: "exp-nokey", r2_key: null }],
					meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 1, rows_written: 0 },
				},
				{ results: [], meta },
			],
			storageDeleteFn: storageDel,
		});

		const cleaned = await cleanupExpiredExports(ctx);

		expect(cleaned).toBe(1);
		expect(storageDel).not.toHaveBeenCalled();
	});
});

describe("cleanupExpiredWebhooks", () => {
	const meta = (changes: number) => ({
		changes,
		duration: 1,
		last_row_id: 0,
		rows_read: changes,
		rows_written: changes,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should delete expired webhooks in a single batch", async () => {
		const ctx = createTestContext({
			executeResults: [{ results: [], meta: meta(50) }],
		});

		const result = await cleanupExpiredWebhooks(ctx);

		expect(result.totalDeleted).toBe(50);
		expect(result.batchCount).toBe(1);
		expect(ctx.db.execute).toHaveBeenCalledTimes(1);
	});

	it("should continue batching when BATCH_SIZE rows deleted", async () => {
		// First batch returns exactly 1000 (BATCH_SIZE), second returns less → stop
		const ctx = createTestContext({
			executeResults: [
				{ results: [], meta: meta(1000) },
				{ results: [], meta: meta(200) },
			],
		});

		const result = await cleanupExpiredWebhooks(ctx);

		expect(result.totalDeleted).toBe(1200);
		expect(result.batchCount).toBe(2);
	});

	it("should stop when fewer than BATCH_SIZE deleted", async () => {
		const ctx = createTestContext({
			executeResults: [{ results: [], meta: meta(500) }],
		});

		const result = await cleanupExpiredWebhooks(ctx);

		expect(result.totalDeleted).toBe(500);
		expect(result.batchCount).toBe(1);
	});

	it("should handle zero expired webhooks", async () => {
		const ctx = createTestContext({
			executeResults: [{ results: [], meta: meta(0) }],
		});

		const result = await cleanupExpiredWebhooks(ctx);

		expect(result.totalDeleted).toBe(0);
		expect(result.batchCount).toBe(1);
	});
});
